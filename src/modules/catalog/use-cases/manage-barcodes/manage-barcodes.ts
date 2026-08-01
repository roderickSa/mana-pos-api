import type { TimeManager } from '#shared/ports/time-manager.js';
import type { BarcodeAliasRepository } from '#modules/catalog/ports/barcode-alias-repository.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import { BarcodeAlreadyInUse } from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';

export class ProductBarcodes {
  constructor(
    readonly productId: string,
    readonly barcodes: string[],
  ) {}
}

export class BarcodeAdded {
  constructor(readonly barcodes: ProductBarcodes) {}
}

export class BarcodeRemoved {
  constructor(readonly barcodes: ProductBarcodes) {}
}

export type AddProductBarcodeResult = BarcodeAdded | ProductNotFound | BarcodeAlreadyInUse;

export class ListProductBarcodes {
  constructor(private readonly aliasRepository: BarcodeAliasRepository) {}

  async execute(productId: string): Promise<ProductBarcodes> {
    return new ProductBarcodes(productId, await this.aliasRepository.listByProduct(productId));
  }
}

export class AddProductBarcode {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly aliasRepository: BarcodeAliasRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(productId: string, barcode: string): Promise<AddProductBarcodeResult> {
    const product = await this.productRepository.findById(productId);
    if (product === null) {
      return new ProductNotFound(productId);
    }
    // findByBarcode ya resuelve principal + alias: cubre ambos casos.
    const owner = await this.productRepository.findByBarcode(barcode);
    if (owner !== null) {
      return new BarcodeAlreadyInUse(barcode);
    }
    await this.aliasRepository.add(productId, barcode, this.timeManager.now());
    return new BarcodeAdded(
      new ProductBarcodes(productId, await this.aliasRepository.listByProduct(productId)),
    );
  }
}

export class RemoveProductBarcode {
  constructor(private readonly aliasRepository: BarcodeAliasRepository) {}

  async execute(productId: string, barcode: string): Promise<BarcodeRemoved> {
    await this.aliasRepository.remove(productId, barcode);
    return new BarcodeRemoved(
      new ProductBarcodes(productId, await this.aliasRepository.listByProduct(productId)),
    );
  }
}
