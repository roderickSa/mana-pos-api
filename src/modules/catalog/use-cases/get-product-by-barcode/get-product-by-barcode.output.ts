import type { Product } from '#modules/catalog/domain/product.js';

export class ProductFoundByBarcode {
  constructor(readonly product: Product) {}
}

export class UnknownBarcode {
  constructor(readonly barcode: string) {}
}

export type GetProductByBarcodeResult = ProductFoundByBarcode | UnknownBarcode;
