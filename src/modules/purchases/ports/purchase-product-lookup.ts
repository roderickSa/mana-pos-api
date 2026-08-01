import type { Nullable } from '#shared/domain/nullable.js';

export class PurchasableProduct {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
  ) {}
}

export interface PurchaseProductLookup {
  findById(productId: string): Promise<Nullable<PurchasableProduct>>;
}
