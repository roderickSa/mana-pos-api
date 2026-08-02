import type { PurchaseReception } from '#modules/purchases/domain/purchase-reception.js';

export interface PurchaseReceptionRepository {
  save(reception: PurchaseReception): Promise<void>;
  listByOrder(orderId: string): Promise<PurchaseReception[]>;
}
