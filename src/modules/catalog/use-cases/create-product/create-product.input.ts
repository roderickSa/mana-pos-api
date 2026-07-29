import type { Nullable } from '#shared/domain/nullable.js';

export class CreateUnitProductInput {
  constructor(
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly category: string,
    readonly supplierId: Nullable<string>,
    readonly priceCents: number,
    readonly costCents: number,
    readonly stockMinimum: number,
    readonly quickAccess: boolean,
  ) {}
}

export class CreateWeightProductInput {
  constructor(
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly category: string,
    readonly supplierId: Nullable<string>,
    readonly pricePerKgCents: number,
    readonly costPerKgCents: number,
    readonly stockMinimumGrams: number,
    readonly quickAccess: boolean,
  ) {}
}

export type CreateProductInput = CreateUnitProductInput | CreateWeightProductInput;
