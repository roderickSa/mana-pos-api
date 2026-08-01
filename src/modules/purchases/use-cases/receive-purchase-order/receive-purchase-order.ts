import type { TimeManager } from '#shared/ports/time-manager.js';
import type { PurchaseOrderLine } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';
import type { StockReceiver } from '#modules/purchases/ports/stock-receiver.js';
import { PurchaseOrderNotFoundById } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';
import type {
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.input.js';
import {
  LineNotInOrder,
  NothingToReceive,
  OrderNotReceivable,
  ProductMissingInInventory,
  PurchaseOrderReceived,
  type ReceivePurchaseOrderResult,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.output.js';

export class ReceivePurchaseOrder {
  constructor(
    private readonly orderRepository: PurchaseOrderRepository,
    private readonly stockReceiver: StockReceiver,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ReceivePurchaseOrderInput): Promise<ReceivePurchaseOrderResult> {
    if (input.lines.length === 0) {
      return new NothingToReceive();
    }

    const order = await this.orderRepository.findById(input.orderId);
    if (order === null) {
      return new PurchaseOrderNotFoundById(input.orderId);
    }
    if (!order.canReceive()) {
      return new OrderNotReceivable(order.id, order.status);
    }

    // Se valida todo ANTES de tocar stock: una línea ajena no deja media
    // recepción aplicada.
    const deliveries: { line: PurchaseOrderLine; lineInput: ReceivePurchaseOrderLineInput }[] = [];
    for (const lineInput of input.lines) {
      const line = order.findLine(lineInput.lineId);
      if (line === null) {
        return new LineNotInOrder(order.id, lineInput.lineId);
      }
      deliveries.push({ line, lineInput });
    }

    const quantities = new Map<string, number>();
    for (const { line, lineInput } of deliveries) {
      const delivered = await this.stockReceiver.receivePurchase(
        line.productId,
        lineInput.quantity,
        lineInput.unitCostCents ?? line.unitCostCents,
        lineInput.expiryDate,
        input.receivedBy,
      );
      if (!delivered) {
        return new ProductMissingInInventory(line.productId);
      }
      quantities.set(line.id, lineInput.quantity);
    }

    const received = order.receive(quantities, this.timeManager.now());
    await this.orderRepository.save(received);
    return new PurchaseOrderReceived(received);
  }
}
