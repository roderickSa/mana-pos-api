import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';
import { unitCostFromPack } from '#modules/catalog/domain/pack-pricing.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import {
  CreateUnitProductInput,
  type CreateProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
  NameAlreadyInUse,
  ProductCreated,
  ShortCodeAlreadyInUse,
  SupplierNotFound,
  type CreateProductResult,
} from '#modules/catalog/use-cases/create-product/create-product.output.js';
import type { SupplierLookup } from '#modules/catalog/ports/supplier-lookup.js';

export class CreateProduct {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly supplierLookup: SupplierLookup,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreateProductInput): Promise<CreateProductResult> {
    if (input.barcode !== null) {
      const existing = await this.productRepository.findByBarcode(input.barcode);
      if (existing !== null) {
        return new BarcodeAlreadyInUse(input.barcode);
      }
    }

    if (input.shortCode !== null) {
      const owner = await this.productRepository.findByShortCode(input.shortCode);
      if (owner !== null) {
        return new ShortCodeAlreadyInUse(input.shortCode);
      }
    }

    for (const supplierId of input.supplierIds) {
      if (!(await this.supplierLookup.exists(supplierId))) {
        return new SupplierNotFound(supplierId);
      }
    }

    if (!input.allowDuplicateName) {
      const sameName = await this.productRepository.findByNormalizedName(
        normalizeSearchText(input.name),
      );
      if (sameName !== null) {
        return new NameAlreadyInUse(sameName.id, sameName.name);
      }
    }

    const product = this.buildProduct(input);
    await this.productRepository.save(product);
    return new ProductCreated(product);
  }

  private buildProduct(input: CreateProductInput): Product {
    const id = this.idGenerator.generate();
    const now = this.timeManager.now();
    const normalizedName = normalizeSearchText(input.name);

    if (input instanceof CreateUnitProductInput) {
      // Con datos de empaque, el costo unitario se deriva del costo por caja.
      const costCents =
        input.packSize !== null && input.packCostCents !== null
          ? unitCostFromPack(input.packCostCents, input.packSize)
          : input.costCents;
      return new UnitProduct(
        id,
        input.barcode,
        input.shortCode,
        input.name,
        normalizedName,
        input.category,
        input.supplierIds,
        null,
        input.priceCents,
        costCents,
        input.packSize,
        input.packCostCents,
        0,
        input.stockMinimum,
        true,
        input.quickAccess,
        now,
        now,
      );
    }

    return new WeightProduct(
      id,
      input.barcode,
      input.shortCode,
      input.name,
      normalizedName,
      input.category,
      input.supplierIds,
      null,
      input.pricePerKgCents,
      input.costPerKgCents,
      0,
      input.stockMinimumGrams,
      true,
      input.quickAccess,
      now,
      now,
    );
  }
}
