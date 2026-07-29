import type { Nullable } from '#shared/domain/nullable.js';

export class SearchProductsInput {
  constructor(
    readonly query: Nullable<string>,
    readonly category: Nullable<string>,
    readonly onlyQuickAccess: boolean,
    readonly includeInactive: boolean,
    readonly orderBySales: boolean,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
