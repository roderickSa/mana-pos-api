import type { PurchaseOrder, PurchaseOrderStatus } from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderNotFoundById } from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';

export class PurchaseOrderReceived {
  constructor(readonly order: PurchaseOrder) {}
}

export class OrderNotReceivable {
  constructor(
    readonly orderId: string,
    readonly status: PurchaseOrderStatus,
  ) {}
}

export class LineNotInOrder {
  constructor(
    readonly orderId: string,
    readonly lineId: string,
  ) {}
}

export class NothingToReceive {}

export class ProductMissingInInventory {
  constructor(readonly productId: string) {}
}

export type ReceivePurchaseOrderResult =
  | PurchaseOrderReceived
  | PurchaseOrderNotFoundById
  | OrderNotReceivable
  | LineNotInOrder
  | NothingToReceive
  | ProductMissingInInventory;
