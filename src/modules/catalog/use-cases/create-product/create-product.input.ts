import type { Nullable } from '#shared/domain/nullable.js';

export class CreateUnitProductInput {
  constructor(
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly category: string,
    readonly supplierIds: string[],
    readonly priceCents: number,
    readonly costCents: number,
    readonly packSize: Nullable<number>,
    readonly packCostCents: Nullable<number>,
    readonly stockMinimum: number,
    readonly quickAccess: boolean,
    // true = el usuario ya vio la advertencia de nombre repetido y confirmó.
    readonly allowDuplicateName: boolean,
  ) {}
}

export class CreateWeightProductInput {
  constructor(
    readonly barcode: Nullable<string>,
    readonly shortCode: Nullable<string>,
    readonly name: string,
    readonly category: string,
    readonly supplierIds: string[],
    readonly pricePerKgCents: number,
    readonly costPerKgCents: number,
    readonly stockMinimumGrams: number,
    readonly quickAccess: boolean,
    readonly allowDuplicateName: boolean,
  ) {}
}

export type CreateProductInput = CreateUnitProductInput | CreateWeightProductInput;
