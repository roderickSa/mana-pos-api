import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { GetProductByBarcodeInput } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.input.js';
import {
  ProductFoundByBarcode,
  UnknownBarcode,
  type GetProductByBarcodeResult,
} from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.output.js';

export class GetProductByBarcode {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: GetProductByBarcodeInput): Promise<GetProductByBarcodeResult> {
    const product = await this.productRepository.findByBarcode(input.barcode);
    if (product === null) {
      return new UnknownBarcode(input.barcode);
    }
    return new ProductFoundByBarcode(product);
  }
}
