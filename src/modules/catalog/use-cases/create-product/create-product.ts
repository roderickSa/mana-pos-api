import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { normalizeSearchText } from '#modules/catalog/domain/normalize-search-text.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import {
  CreateUnitProductInput,
  type CreateProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
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

    if (input.supplierId !== null && !(await this.supplierLookup.exists(input.supplierId))) {
      return new SupplierNotFound(input.supplierId);
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
      return new UnitProduct(
        id,
        input.barcode,
        input.shortCode,
        input.name,
        normalizedName,
        input.category,
        input.supplierId,
        null,
        input.priceCents,
        input.costCents,
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
      input.supplierId,
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
