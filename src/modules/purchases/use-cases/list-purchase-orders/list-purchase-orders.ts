import type { PurchaseOrderSummary } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';

export class ListPurchaseOrders {
  constructor(private readonly orderRepository: PurchaseOrderRepository) {}

  async execute(): Promise<PurchaseOrderSummary[]> {
    return this.orderRepository.list();
  }
}
