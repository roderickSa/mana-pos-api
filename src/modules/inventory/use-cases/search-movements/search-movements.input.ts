import type { Nullable } from '#shared/domain/nullable.js';
import type { StockMovementKind } from '#modules/inventory/domain/stock-movement.js';

export class SearchMovementsInput {
  constructor(
    readonly productQuery: Nullable<string>,
    readonly kind: Nullable<StockMovementKind>,
    readonly from: Nullable<Date>,
    readonly to: Nullable<Date>,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
