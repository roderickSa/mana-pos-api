import type { Nullable } from '#shared/domain/nullable.js';

// 'default' = mostrador primero + nombre (la grilla de Vender depende de eso);
// 'sales' = más vendidos primero; el resto son las columnas ordenables del
// listado de Inventario.
export type ProductOrder = 'default' | 'sales' | 'name' | 'price' | 'stock' | 'margin';

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
    readonly orderBy: ProductOrder,
    readonly descending: boolean,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
