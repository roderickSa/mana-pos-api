import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

export class StockAdjusted {
  constructor(readonly movement: StockMovement) {}
}

export class AdjustmentExceedsStock {
  constructor(
    readonly productId: string,
    readonly availableQuantity: number,
    readonly requestedQuantity: number,
  ) {}
}

export type RegisterStockAdjustmentResult =
  | StockAdjusted
  | AdjustmentExceedsStock
  | ProductNotFoundInInventory;
