import type { PurchaseReception } from '#modules/purchases/domain/purchase-reception.js';
import type { PurchaseReceptionRepository } from '#modules/purchases/ports/purchase-reception-repository.js';

export class PurchaseReceptionRepositoryForTesting implements PurchaseReceptionRepository {
  private readonly receptions: PurchaseReception[] = [];

  async save(reception: PurchaseReception): Promise<void> {
    this.receptions.push(reception);
  }

  async listByOrder(orderId: string): Promise<PurchaseReception[]> {
    return this.receptions.filter((reception) => reception.orderId === orderId);
  }
}
