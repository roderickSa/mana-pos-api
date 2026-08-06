import type { Nullable } from '#shared/domain/nullable.js';

export type BulkPriceMode = 'percent' | 'amount';

export class BulkUpdatePricesInput {
  constructor(
    // Filtros combinables; ambos null = todo el catálogo activo.
    readonly category: Nullable<string>,
    readonly supplierId: Nullable<string>,
    // percent: value es % (puede tener decimales); amount: value es céntimos.
    // Negativo = bajar precios. El resultado SIEMPRE se redondea a 10
    // céntimos: en Perú no existen precios más finos.
    readonly mode: BulkPriceMode,
    readonly value: number,
    // false = solo vista previa; true = aplicar los cambios.
    readonly apply: boolean,
  ) {}
}
