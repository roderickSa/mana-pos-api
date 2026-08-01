import type { Nullable } from '#shared/domain/nullable.js';

export class UnitProduct {
  constructor(
    readonly id: string,
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly normalizedName: string,
    readonly category: string,
    // Proveedores a los que se le compra; vacío = costo directo sin proveedor.
    readonly supplierIds: string[],
    readonly imagePath: Nullable<string>,
    readonly priceCents: number,
    readonly costCents: number,
    // Compra por empaque: 1 caja/paquete = packSize unidades a packCostCents.
    // Ambos van juntos (los dos con valor o los dos null).
    readonly packSize: Nullable<number>,
    readonly packCostCents: Nullable<number>,
    readonly stockUnits: number,
    readonly stockMinimum: number,
    readonly active: boolean,
    readonly quickAccess: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}

export class WeightProduct {
  constructor(
    readonly id: string,
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly normalizedName: string,
    readonly category: string,
    readonly supplierIds: string[],
    readonly imagePath: Nullable<string>,
    readonly pricePerKgCents: number,
    readonly costPerKgCents: number,
    readonly stockGrams: number,
    readonly stockMinimumGrams: number,
    readonly active: boolean,
    readonly quickAccess: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}

export type Product = UnitProduct | WeightProduct;
