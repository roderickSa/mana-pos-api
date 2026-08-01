import type { TimeManager } from '#shared/ports/time-manager.js';
import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';
import { unitCostFromPack } from '#modules/catalog/domain/pack-pricing.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { UpdateProductInput } from '#modules/catalog/use-cases/update-product/update-product.input.js';
import {
  BarcodeTakenByAnotherProduct,
  ProductNotFound,
  ProductUpdated,
  type UpdateProductResult,
} from '#modules/catalog/use-cases/update-product/update-product.output.js';
import { ShortCodeAlreadyInUse, SupplierNotFound } from '#modules/catalog/use-cases/create-product/create-product.output.js';
import type { SupplierLookup } from '#modules/catalog/ports/supplier-lookup.js';

export class UpdateProduct {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly supplierLookup: SupplierLookup,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: UpdateProductInput): Promise<UpdateProductResult> {
    const existing = await this.productRepository.findById(input.id);
    if (existing === null) {
      return new ProductNotFound(input.id);
    }

    if (input.shortCode !== null) {
      const owner = await this.productRepository.findByShortCode(input.shortCode);
      if (owner !== null && owner.id !== input.id) {
        return new ShortCodeAlreadyInUse(input.shortCode);
      }
    }

    for (const supplierId of input.supplierIds) {
      if (!(await this.supplierLookup.exists(supplierId))) {
        return new SupplierNotFound(supplierId);
      }
    }

    if (input.barcode !== null) {
      const barcodeOwner = await this.productRepository.findByBarcode(input.barcode);
      if (barcodeOwner !== null && barcodeOwner.id !== input.id) {
        return new BarcodeTakenByAnotherProduct(input.barcode);
      }
    }

    const updated = this.rebuildProduct(existing, input);
    await this.productRepository.save(updated);
    return new ProductUpdated(updated);
  }

  private rebuildProduct(existing: Product, input: UpdateProductInput): Product {
    const now = this.timeManager.now();
    const normalizedName = normalizeSearchText(input.name);

    if (existing instanceof UnitProduct) {
      // Con datos de empaque, el costo unitario se deriva del costo por caja.
      const costCents =
        input.packSize !== null && input.packCostCents !== null
          ? unitCostFromPack(input.packCostCents, input.packSize)
          : input.costCents;
      return new UnitProduct(
        existing.id,
        input.barcode,
        input.shortCode,
        input.name,
        normalizedName,
        input.category,
        input.supplierIds,
        existing.imagePath,
        input.priceCents,
        costCents,
        input.packSize,
        input.packCostCents,
        existing.stockUnits,
        input.stockMinimum,
        input.active,
        input.quickAccess,
        existing.createdAt,
        now,
      );
    }

    return new WeightProduct(
      existing.id,
      input.barcode,
      input.shortCode,
      input.name,
      normalizedName,
      input.category,
      input.supplierIds,
      existing.imagePath,
      input.priceCents,
      input.costCents,
      existing.stockGrams,
      input.stockMinimum,
      input.active,
      input.quickAccess,
      existing.createdAt,
      now,
    );
  }
}
