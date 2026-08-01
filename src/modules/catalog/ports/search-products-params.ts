import type { Nullable } from '#shared/domain/nullable.js';

export class SearchProductsParams {
  constructor(
    readonly normalizedQuery: Nullable<string>,
    readonly category: Nullable<string>,
    readonly supplierId: Nullable<string>,
    readonly onlyQuickAccess: boolean,
    readonly onlyLowStock: boolean,
    // Solo productos sin costo capturado (para la captura masiva de costos).
    readonly onlyMissingCost: boolean,
    readonly includeInactive: boolean,
    readonly orderBySales: boolean,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
