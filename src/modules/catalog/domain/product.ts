import type { Nullable } from '#shared/domain/nullable.js';

export class UnitProduct {
  constructor(
    readonly id: string,
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly normalizedName: string,
    readonly category: string,
    readonly supplierId: Nullable<string>,
    readonly imagePath: Nullable<string>,
    readonly priceCents: number,
    readonly costCents: number,
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
    readonly supplierId: Nullable<string>,
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
