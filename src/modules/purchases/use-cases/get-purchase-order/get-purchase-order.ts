import type { PurchaseOrder } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';

export class PurchaseOrderFound {
  constructor(readonly order: PurchaseOrder) {}
}

export class PurchaseOrderNotFoundById {
  constructor(readonly orderId: string) {}
}

export type GetPurchaseOrderResult = PurchaseOrderFound | PurchaseOrderNotFoundById;

export class GetPurchaseOrder {
  constructor(private readonly orderRepository: PurchaseOrderRepository) {}

  async execute(orderId: string): Promise<GetPurchaseOrderResult> {
    const order = await this.orderRepository.findById(orderId);
    return order === null ? new PurchaseOrderNotFoundById(orderId) : new PurchaseOrderFound(order);
  }
}
