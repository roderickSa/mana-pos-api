import { PurchaseOrder } from '#modules/purchases/domain/purchase-order.js';
import { CreatePurchaseOrder } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.js';
import {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.input.js';
import {
  EmptyPurchaseOrder,
  ProductNotFoundInOrder,
  PurchaseOrderCreated,
  SupplierNotFoundForOrder,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.output.js';
import {
  CancelPurchaseOrder,
  PurchaseOrderCancelled,
  PurchaseOrderNotCancellable,
} from '#modules/purchases/use-cases/cancel-purchase-order/cancel-purchase-order.js';
import { PurchaseOrderNotFoundById } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';
import { PurchaseOrderRepositoryForTesting } from '../test-doubles/purchase-order-repository-for-testing.js';
import { PurchaseProductLookupForTesting } from '../test-doubles/purchase-product-lookup-for-testing.js';
import { SupplierLookupForTesting } from '../test-doubles/supplier-lookup-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

function build() {
  const repository = new PurchaseOrderRepositoryForTesting();
  const productLookup = new PurchaseProductLookupForTesting();
  const supplierLookup = new SupplierLookupForTesting();
  const timeManager = new TimeManagerForTesting();
  const create = new CreatePurchaseOrder(
    repository,
    productLookup,
    supplierLookup,
    new IdGeneratorForTesting(),
    timeManager,
  );
  const cancel = new CancelPurchaseOrder(repository, timeManager);
  return { repository, productLookup, supplierLookup, create, cancel };
}

describe('CreatePurchaseOrder', () => {
  it('creates an open order with lines valued per unit and per kg', async () => {
    const { repository, productLookup, supplierLookup, create } = build();
    supplierLookup.addSupplier('prov-1');
    productLookup.addProduct('arroz', 'Arroz Costeño 5kg', 'unit');
    productLookup.addProduct('queso', 'Queso Paria', 'weight');

    const result = await create.execute(
      new CreatePurchaseOrderInput('prov-1', 'reponer fin de semana', 'encargado', [
        // 2 cajas de 6 bolsas a S/ 132.00 la caja → 12 unidades a S/ 22.00
        new CreatePurchaseOrderLineInput('arroz', 12, 2200, 6, 13200),
        // 3 kg de queso a S/ 28.00 el kg
        new CreatePurchaseOrderLineInput('queso', 3000, 2800, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(PurchaseOrderCreated);
    if (!(result instanceof PurchaseOrderCreated)) return;
    expect(result.order.status).toBe('open');
    expect(result.order.lines).toHaveLength(2);
    expect(result.order.lines[0]?.description).toBe('Arroz Costeño 5kg');
    expect(result.order.lines[0]?.totalCents).toBeDefined();
    expect(result.order.lines[0]?.totalCents()).toBe(26400);
    expect(result.order.lines[1]?.totalCents()).toBe(8400);
    expect(result.order.totalCents()).toBe(34800);
    expect(repository.all()).toHaveLength(1);
  });

  it('rejects an unknown supplier', async () => {
    const { create, repository } = build();

    const result = await create.execute(
      new CreatePurchaseOrderInput('prov-fantasma', null, 'encargado', [
        new CreatePurchaseOrderLineInput('arroz', 1, 100, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(SupplierNotFoundForOrder);
    expect(repository.all()).toHaveLength(0);
  });

  it('rejects an unknown product', async () => {
    const { create, supplierLookup, repository } = build();
    supplierLookup.addSupplier('prov-1');

    const result = await create.execute(
      new CreatePurchaseOrderInput('prov-1', null, 'encargado', [
        new CreatePurchaseOrderLineInput('fantasma', 1, 100, null, null),
      ]),
    );

    expect(result).toBeInstanceOf(ProductNotFoundInOrder);
    expect(repository.all()).toHaveLength(0);
  });

  it('rejects an order without lines', async () => {
    const { create } = build();

    const result = await create.execute(new CreatePurchaseOrderInput('prov-1', null, 'encargado', []));

    expect(result).toBeInstanceOf(EmptyPurchaseOrder);
  });
});

describe('CancelPurchaseOrder', () => {
  async function createOrder(parts: ReturnType<typeof build>): Promise<PurchaseOrder> {
    parts.supplierLookup.addSupplier('prov-1');
    parts.productLookup.addProduct('arroz', 'Arroz');
    const created = await parts.create.execute(
      new CreatePurchaseOrderInput('prov-1', null, 'encargado', [
        new CreatePurchaseOrderLineInput('arroz', 5, 2200, null, null),
      ]),
    );
    if (!(created instanceof PurchaseOrderCreated)) throw new Error('order not created');
    return created.order;
  }

  it('cancels an open order', async () => {
    const parts = build();
    const order = await createOrder(parts);

    const result = await parts.cancel.execute(order.id);

    expect(result).toBeInstanceOf(PurchaseOrderCancelled);
    expect((await parts.repository.findById(order.id))?.status).toBe('cancelled');
  });

  it('refuses to cancel an order that is not open', async () => {
    const parts = build();
    const order = await createOrder(parts);
    await parts.repository.save(order.cancel(new Date('2026-08-01T12:00:00')));

    const result = await parts.cancel.execute(order.id);

    expect(result).toBeInstanceOf(PurchaseOrderNotCancellable);
  });

  it('returns not found for an unknown order', async () => {
    const { cancel } = build();
    expect(await cancel.execute('missing')).toBeInstanceOf(PurchaseOrderNotFoundById);
  });
});
