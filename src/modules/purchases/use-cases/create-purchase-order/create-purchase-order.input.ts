import type { Nullable } from '#shared/domain/nullable.js';

export class CreatePurchaseOrderLineInput {
  constructor(
    readonly productId: string,
    // Unidades para productos por unidad, gramos para pesables.
    readonly quantity: number,
    // Costo pactado por unidad o por kg.
    readonly unitCostCents: number,
    readonly packSize: Nullable<number>,
    readonly packCostCents: Nullable<number>,
  ) {}
}

export class CreatePurchaseOrderInput {
  constructor(
    readonly supplierId: string,
    readonly notes: Nullable<string>,
    readonly createdBy: string,
    readonly lines: CreatePurchaseOrderLineInput[],
  ) {}
}
