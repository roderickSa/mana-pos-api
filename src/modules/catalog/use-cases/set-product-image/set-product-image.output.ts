import type { Product } from '#modules/catalog/domain/product.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';

export class ProductImageSet {
  constructor(readonly product: Product) {}
}

export class ProductImageRemoved {
  constructor(readonly product: Product) {}
}

export type SetProductImageResult = ProductImageSet | ProductNotFound;
export type RemoveProductImageResult = ProductImageRemoved | ProductNotFound;
