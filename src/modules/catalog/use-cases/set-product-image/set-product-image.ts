import type { TimeManager } from '#shared/ports/time-manager.js';
import type { Nullable } from '#shared/domain/nullable.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ImageStore } from '#modules/catalog/ports/image-store.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import {
  RemoveProductImageInput,
  SetProductImageInput,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.input.js';
import {
  ProductImageRemoved,
  ProductImageSet,
  type RemoveProductImageResult,
  type SetProductImageResult,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.output.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';

export class SetProductImage {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly imageStore: ImageStore,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: SetProductImageInput): Promise<SetProductImageResult> {
    const existing = await this.productRepository.findById(input.productId);
    if (existing === null) {
      return new ProductNotFound(input.productId);
    }

    if (existing.imagePath !== null) {
      await this.imageStore.remove(existing.imagePath);
    }
    const imagePath = await this.imageStore.save(input.productId, input.data, input.extension);
    const updated = withImagePath(existing, imagePath, this.timeManager.now());
    await this.productRepository.save(updated);
    return new ProductImageSet(updated);
  }
}

export class RemoveProductImage {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly imageStore: ImageStore,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RemoveProductImageInput): Promise<RemoveProductImageResult> {
    const existing = await this.productRepository.findById(input.productId);
    if (existing === null) {
      return new ProductNotFound(input.productId);
    }

    if (existing.imagePath !== null) {
      await this.imageStore.remove(existing.imagePath);
      const updated = withImagePath(existing, null, this.timeManager.now());
      await this.productRepository.save(updated);
      return new ProductImageRemoved(updated);
    }
    return new ProductImageRemoved(existing);
  }
}

function withImagePath(product: Product, imagePath: Nullable<string>, now: Date): Product {
  if (product instanceof UnitProduct) {
    return new UnitProduct(
      product.id,
      product.barcode,
      product.shortCode,
      product.name,
      product.normalizedName,
      product.category,
      product.supplierIds,
      imagePath,
      product.priceCents,
      product.costCents,
      product.packSize,
      product.packCostCents,
      product.stockUnits,
      product.stockMinimum,
      product.active,
      product.quickAccess,
      product.createdAt,
      now,
    );
  }
  return new WeightProduct(
    product.id,
    product.barcode,
    product.shortCode,
    product.name,
    product.normalizedName,
    product.category,
    product.supplierIds,
    imagePath,
    product.pricePerKgCents,
    product.costPerKgCents,
    product.stockGrams,
    product.stockMinimumGrams,
    product.active,
    product.quickAccess,
    product.createdAt,
    now,
  );
}
