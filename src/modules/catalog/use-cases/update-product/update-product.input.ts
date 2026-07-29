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
    readonly supplierId: Nullable<string>,
    readonly priceCents: number,
    readonly costCents: number,
    readonly stockMinimum: number,
    readonly active: boolean,
    readonly quickAccess: boolean,
  ) {}
}
