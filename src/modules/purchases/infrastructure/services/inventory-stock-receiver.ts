import type { Nullable } from '#shared/domain/nullable.js';
import type { RegisterStockEntry } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.js';
import { RegisterStockEntryInput } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.input.js';
import { StockEntryRegistered } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { StockReceiver } from '#modules/purchases/ports/stock-receiver.js';

export class InventoryStockReceiver implements StockReceiver {
  constructor(private readonly registerStockEntry: RegisterStockEntry) {}

  async receivePurchase(
    productId: string,
    quantity: number,
    unitCostCents: number,
    expiryDate: Nullable<Date>,
    userId: string,
  ): Promise<boolean> {
    const result = await this.registerStockEntry.execute(
      new RegisterStockEntryInput(productId, quantity, userId, unitCostCents, expiryDate),
    );
    return result instanceof StockEntryRegistered;
  }
}
