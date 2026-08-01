import type { Nullable } from '#shared/domain/nullable.js';

export class SearchProductsParams {
  constructor(
    readonly normalizedQuery: Nullable<string>,
    readonly category: Nullable<string>,
    readonly onlyQuickAccess: boolean,
    readonly onlyLowStock: boolean,
    readonly includeInactive: boolean,
    readonly orderBySales: boolean,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
