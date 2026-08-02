import type { PurchaseOrder } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseReception } from '#modules/purchases/domain/purchase-reception.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';
import type { PurchaseReceptionRepository } from '#modules/purchases/ports/purchase-reception-repository.js';

export class PurchaseOrderFound {
  constructor(
    readonly order: PurchaseOrder,
    readonly receptions: PurchaseReception[],
  ) {}
}

export class PurchaseOrderNotFoundById {
  constructor(readonly orderId: string) {}
}

export type GetPurchaseOrderResult = PurchaseOrderFound | PurchaseOrderNotFoundById;

export class GetPurchaseOrder {
  constructor(
    private readonly orderRepository: PurchaseOrderRepository,
    private readonly receptionRepository: PurchaseReceptionRepository,
  ) {}

  async execute(orderId: string): Promise<GetPurchaseOrderResult> {
    const order = await this.orderRepository.findById(orderId);
    if (order === null) {
      return new PurchaseOrderNotFoundById(orderId);
    }
    return new PurchaseOrderFound(order, await this.receptionRepository.listByOrder(orderId));
  }
}
