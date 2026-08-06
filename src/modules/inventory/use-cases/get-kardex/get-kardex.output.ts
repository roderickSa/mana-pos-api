import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

// Movimiento + saldo resultante: sin el saldo después de cada movimiento el
// kardex no sirve para cuadrar inventario.
export class KardexEntry {
  constructor(
    readonly movement: StockMovement,
    readonly balanceAfter: number,
  ) {}
}

export class KardexFound {
  constructor(
    readonly productId: string,
    readonly currentQuantity: number,
    readonly entries: KardexEntry[],
  ) {}
}

export type GetKardexResult = KardexFound | ProductNotFoundInInventory;
