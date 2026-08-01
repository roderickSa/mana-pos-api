import type { PurchaseOrder } from '#modules/purchases/domain/purchase-order.js';

export class PurchaseOrderCreated {
  constructor(readonly order: PurchaseOrder) {}
}

export class SupplierNotFoundForOrder {
  constructor(readonly supplierId: string) {}
}

export class ProductNotFoundInOrder {
  constructor(readonly productId: string) {}
}

export class EmptyPurchaseOrder {}

export type CreatePurchaseOrderResult =
  | PurchaseOrderCreated
  | SupplierNotFoundForOrder
  | ProductNotFoundInOrder
  | EmptyPurchaseOrder;
