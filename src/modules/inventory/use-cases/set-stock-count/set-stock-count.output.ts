import type { Nullable } from '#shared/domain/nullable.js';
import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

// movement es null cuando el conteo coincide con el stock del sistema (sin diferencia).
export class StockCountRegistered {
  constructor(
    readonly productId: string,
    readonly difference: number,
    readonly movement: Nullable<StockMovement>,
  ) {}
}

export type SetStockCountResult = StockCountRegistered | ProductNotFoundInInventory;
