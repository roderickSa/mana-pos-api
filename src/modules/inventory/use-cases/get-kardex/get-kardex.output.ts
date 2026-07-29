import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

export class KardexFound {
  constructor(
    readonly productId: string,
    readonly currentQuantity: number,
    readonly movements: StockMovement[],
  ) {}
}

export type GetKardexResult = KardexFound | ProductNotFoundInInventory;
