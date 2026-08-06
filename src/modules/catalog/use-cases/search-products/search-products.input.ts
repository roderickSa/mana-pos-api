import type { Nullable } from '#shared/domain/nullable.js';
import type { ProductOrder } from '#modules/catalog/ports/search-products-params.js';

export class SearchProductsInput {
  constructor(
    readonly query: Nullable<string>,
    readonly category: Nullable<string>,
    readonly supplierId: Nullable<string>,
    readonly onlyQuickAccess: boolean,
    readonly onlyLowStock: boolean,
    readonly onlyMissingCost: boolean,
    readonly includeInactive: boolean,
    readonly orderBy: ProductOrder,
    readonly descending: boolean,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
