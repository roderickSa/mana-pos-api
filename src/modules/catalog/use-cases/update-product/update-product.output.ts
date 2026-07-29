import type { Product } from '#modules/catalog/domain/product.js';
import { ShortCodeAlreadyInUse, SupplierNotFound } from '#modules/catalog/use-cases/create-product/create-product.output.js';

export class ProductUpdated {
  constructor(readonly product: Product) {}
}

export class ProductNotFound {
  constructor(readonly productId: string) {}
}

export class BarcodeTakenByAnotherProduct {
  constructor(readonly barcode: string) {}
}

export type UpdateProductResult =
  | ProductUpdated
  | ProductNotFound
  | BarcodeTakenByAnotherProduct
  | ShortCodeAlreadyInUse
  | SupplierNotFound;
