import type { Nullable } from '#shared/domain/nullable.js';
import type { PurchaseOrder, PurchaseOrderSummary } from '#modules/purchases/domain/purchase-order.js';

export interface PurchaseOrderRepository {
  save(order: PurchaseOrder): Promise<void>;
  // Siguiente correlativo humano (max + 1).
  nextNumber(): Promise<number>;
  findById(id: string): Promise<Nullable<PurchaseOrder>>;
  list(): Promise<PurchaseOrderSummary[]>;
}
