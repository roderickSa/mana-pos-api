import type { Product } from '#modules/catalog/domain/product.js';

export class ProductCreated {
  constructor(readonly product: Product) {}
}

export class BarcodeAlreadyInUse {
  constructor(readonly barcode: string) {}
}

export class ShortCodeAlreadyInUse {
  constructor(readonly shortCode: string) {}
}

export class SupplierNotFound {
  constructor(readonly supplierId: string) {}
}

export type CreateProductResult =
  | ProductCreated
  | BarcodeAlreadyInUse
  | ShortCodeAlreadyInUse
  | SupplierNotFound;
