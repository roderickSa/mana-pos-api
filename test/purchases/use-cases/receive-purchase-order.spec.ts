import type { PurchaseOrder } from '#modules/purchases/domain/purchase-order.js';
import { CreatePurchaseOrder } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.js';
import {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.input.js';
import { PurchaseOrderCreated } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.output.js';
import { PurchaseOrderNotFoundById } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';
import { ReceivePurchaseOrder } from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.js';
import {
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.input.js';
import {
  LineNotInOrder,
  OrderNotReceivable,
  PurchaseOrderReceived,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.output.js';
import { PurchaseOrderRepositoryForTesting } from '../test-doubles/purchase-order-repository-for-testing.js';
import { PurchaseProductLookupForTesting } from '../test-doubles/purchase-product-lookup-for-testing.js';
import { StockReceiverForTesting } from '../test-doubles/stock-receiver-for-testing.js';
import { SupplierLookupForTesting } from '../test-doubles/supplier-lookup-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

function build() {
  const repository = new PurchaseOrderRepositoryForTesting();
  const stockReceiver = new StockReceiverForTesting();
  const timeManager = new TimeManagerForTesting();
  const receive = new ReceivePurchaseOrder(repository, stockReceiver, timeManager);
  return { repository, stockReceiver, receive };
}

// Orden de prueba: 12 arroces a S/ 22.00 y 3 kg de queso a S/ 28.00 el kg.
async function seedOrder(repository: PurchaseOrderRepositoryForTesting): Promise<PurchaseOrder> {
  const productLookup = new PurchaseProductLookupForTesting();
  const supplierLookup = new SupplierLookupForTesting();
  supplierLookup.addSupplier('prov-1');
  productLookup.addProduct('arroz', 'Arroz Costeño 5kg', 'unit');
  productLookup.addProduct('queso', 'Queso Paria', 'weight');
  const created = await new CreatePurchaseOrder(
    repository,
    productLookup,
    supplierLookup,
    new IdGeneratorForTesting(),
    new TimeManagerForTesting(),
  ).execute(
    new CreatePurchaseOrderInput('prov-1', null, 'encargado', [
      new CreatePurchaseOrderLineInput('arroz', 12, 2200, 6, 13200),
      new CreatePurchaseOrderLineInput('queso', 3000, 2800, null, null),
    ]),
  );
  if (!(created instanceof PurchaseOrderCreated)) throw new Error('order not created');
  return created.order;
}

describe('ReceivePurchaseOrder', () => {
  it('receives part of the order and leaves it partial with pending quantities', async () => {
    const { repository, stockReceiver, receive } = build();
    const order = await seedOrder(repository);
    const arroz = order.lines[0];
    if (arroz === undefined) throw new Error('missing line');

    const result = await receive.execute(
      new ReceivePurchaseOrderInput(order.id, 'encargado', [
        new ReceivePurchaseOrderLineInput(arroz.id, 6, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(PurchaseOrderReceived);
    if (!(result instanceof PurchaseOrderReceived)) return;
    expect(result.order.status).toBe('partial');
    expect(result.order.findLine(arroz.id)?.pendingQuantity()).toBe(6);
    // El stock entró valorizado al costo pactado de la línea.
    expect(stockReceiver.received).toEqual([
      { productId: 'arroz', quantity: 6, unitCostCents: 2200, expiryDate: null, userId: 'encargado' },
    ]);
  });

  it('completes the order using the real cost and batch expiry when provided', async () => {
    const { repository, stockReceiver, receive } = build();
    const order = await seedOrder(repository);
    const [arroz, queso] = order.lines;
    if (arroz === undefined || queso === undefined) throw new Error('missing lines');
    const expiry = new Date('2026-09-15T12:00:00');

    const result = await receive.execute(
      new ReceivePurchaseOrderInput(order.id, 'encargado', [
        new ReceivePurchaseOrderLineInput(arroz.id, 12, 2100, null),
        new ReceivePurchaseOrderLineInput(queso.id, 3000, null, expiry),
      ]),
    );

    expect(result).toBeInstanceOf(PurchaseOrderReceived);
    if (!(result instanceof PurchaseOrderReceived)) return;
    expect(result.order.status).toBe('received');
    expect(stockReceiver.received[0]?.unitCostCents).toBe(2100);
    expect(stockReceiver.received[1]?.expiryDate).toEqual(expiry);
  });

  it('refuses to receive against a cancelled order', async () => {
    const { repository, stockReceiver, receive } = build();
    const order = await seedOrder(repository);
    await repository.save(order.cancel(new Date('2026-08-01T12:00:00')));
    const line = order.lines[0];
    if (line === undefined) throw new Error('missing line');

    const result = await receive.execute(
      new ReceivePurchaseOrderInput(order.id, 'encargado', [
        new ReceivePurchaseOrderLineInput(line.id, 1, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(OrderNotReceivable);
    expect(stockReceiver.received).toHaveLength(0);
  });

  it('rejects a line from another order without touching stock', async () => {
    const { repository, stockReceiver, receive } = build();
    const order = await seedOrder(repository);
    const line = order.lines[0];
    if (line === undefined) throw new Error('missing line');

    const result = await receive.execute(
      new ReceivePurchaseOrderInput(order.id, 'encargado', [
        new ReceivePurchaseOrderLineInput(line.id, 6, null, null),
        new ReceivePurchaseOrderLineInput('linea-ajena', 1, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(LineNotInOrder);
    expect(stockReceiver.received).toHaveLength(0);
    expect((await repository.findById(order.id))?.status).toBe('open');
  });

  it('returns not found for an unknown order', async () => {
    const { receive } = build();

    const result = await receive.execute(
      new ReceivePurchaseOrderInput('missing', 'encargado', [
        new ReceivePurchaseOrderLineInput('l1', 1, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(PurchaseOrderNotFoundById);
  });
});
