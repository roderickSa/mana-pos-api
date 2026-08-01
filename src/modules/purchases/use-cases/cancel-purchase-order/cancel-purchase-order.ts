import type { TimeManager } from '#shared/ports/time-manager.js';
import type { PurchaseOrder, PurchaseOrderStatus } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';
import { PurchaseOrderNotFoundById } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';

export class PurchaseOrderCancelled {
  constructor(readonly order: PurchaseOrder) {}
}

// Solo se cancela una orden abierta: con mercadería recibida ya afectó stock.
export class PurchaseOrderNotCancellable {
  constructor(
    readonly orderId: string,
    readonly status: PurchaseOrderStatus,
  ) {}
}

export type CancelPurchaseOrderResult =
  | PurchaseOrderCancelled
  | PurchaseOrderNotFoundById
  | PurchaseOrderNotCancellable;

export class CancelPurchaseOrder {
  constructor(
    private readonly orderRepository: PurchaseOrderRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(orderId: string): Promise<CancelPurchaseOrderResult> {
    const order = await this.orderRepository.findById(orderId);
    if (order === null) {
      return new PurchaseOrderNotFoundById(orderId);
    }
    if (!order.canBeCancelled()) {
      return new PurchaseOrderNotCancellable(order.id, order.status);
    }
    const cancelled = order.cancel(this.timeManager.now());
    await this.orderRepository.save(cancelled);
    return new PurchaseOrderCancelled(cancelled);
  }
}
