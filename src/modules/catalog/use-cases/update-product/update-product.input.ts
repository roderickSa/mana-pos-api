import type { Nullable } from '#shared/domain/nullable.js';

// priceCents/costCents aplican por unidad para productos por unidad y por kg
// para productos por peso; el tipo de venta de un producto no se puede cambiar.
export class UpdateProductInput {
  constructor(
    readonly id: string,
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly category: string,
    readonly supplierIds: string[],
    readonly priceCents: number,
    readonly costCents: number,
    // Solo aplican a productos por unidad; para pesables llegan null.
    readonly packSize: Nullable<number>,
    readonly packCostCents: Nullable<number>,
    readonly stockMinimum: number,
    readonly active: boolean,
    readonly quickAccess: boolean,
  ) {}
}
