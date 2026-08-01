import type { Nullable } from '#shared/domain/nullable.js';
import type { StockReceiver } from '#modules/purchases/ports/stock-receiver.js';

export interface ReceivedPurchase {
  productId: string;
  quantity: number;
  unitCostCents: number;
  expiryDate: Nullable<Date>;
  userId: string;
}

export class StockReceiverForTesting implements StockReceiver {
  readonly received: ReceivedPurchase[] = [];
  missingProductIds = new Set<string>();

  async receivePurchase(
    productId: string,
    quantity: number,
    unitCostCents: number,
    expiryDate: Nullable<Date>,
    userId: string,
  ): Promise<boolean> {
    if (this.missingProductIds.has(productId)) {
      return false;
    }
    this.received.push({ productId, quantity, unitCostCents, expiryDate, userId });
    return true;
  }
}
