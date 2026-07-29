import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';

export class StockMovementWithProduct {
  constructor(
    readonly movement: StockMovement,
    readonly productName: string,
  ) {}
}

export class StockMovementPage {
  constructor(
    readonly items: StockMovementWithProduct[],
    readonly total: number,
  ) {}
}
