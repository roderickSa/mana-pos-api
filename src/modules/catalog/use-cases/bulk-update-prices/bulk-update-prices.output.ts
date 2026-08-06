import type { PriceChange } from '#modules/catalog/domain/price-change.js';

export class PriceChangesPreviewed {
  constructor(readonly changes: PriceChange[]) {}
}

export class PricesApplied {
  constructor(readonly changes: PriceChange[]) {}
}

export class NoProductsToUpdate {}

export type BulkUpdatePricesResult = PriceChangesPreviewed | PricesApplied | NoProductsToUpdate;
