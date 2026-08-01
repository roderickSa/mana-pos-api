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

// Red contra duplicados tipo "Inca Kola 600ml" dos veces con stock partido:
// el mismo nombre normalizado pide confirmación explícita antes de crear.
export class NameAlreadyInUse {
  constructor(
    readonly existingProductId: string,
    readonly existingName: string,
  ) {}
}

export type CreateProductResult =
  | ProductCreated
  | BarcodeAlreadyInUse
  | ShortCodeAlreadyInUse
  | SupplierNotFound
  | NameAlreadyInUse;
