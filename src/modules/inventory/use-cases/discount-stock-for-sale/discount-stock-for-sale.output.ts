import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

export class StockDiscountedForSale {
  constructor(readonly movements: StockMovement[]) {}
}

// Replay del cobro (retry): el descuento ya se aplicó, no se vuelve a aplicar.
export class SaleAlreadyDiscounted {
  constructor(readonly ticketId: string) {}
}

export type DiscountStockForSaleResult =
  | StockDiscountedForSale
  | SaleAlreadyDiscounted
  | ProductNotFoundInInventory;
