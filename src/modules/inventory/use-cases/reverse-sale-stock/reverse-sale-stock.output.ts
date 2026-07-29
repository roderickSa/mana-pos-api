import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';

export class SaleStockReversed {
  constructor(readonly movements: StockMovement[]) {}
}

export class SaleAlreadyReversed {
  constructor(readonly ticketId: string) {}
}

export class NoSaleMovementsForTicket {
  constructor(readonly ticketId: string) {}
}

export type ReverseSaleStockResult =
  | SaleStockReversed
  | SaleAlreadyReversed
  | NoSaleMovementsForTicket;
