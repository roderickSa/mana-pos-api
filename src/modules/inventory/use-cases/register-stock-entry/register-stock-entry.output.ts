import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';

export class StockEntryRegistered {
  constructor(readonly movement: StockMovement) {}
}

export class ProductNotFoundInInventory {
  constructor(readonly productId: string) {}
}

export type RegisterStockEntryResult = StockEntryRegistered | ProductNotFoundInInventory;
