import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { ProductSupplierLink } from '#modules/catalog/ports/product-supplier-link.js';
import type { SupplierLookup } from '#modules/catalog/ports/supplier-lookup.js';
import { SupplierNotFound } from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';

export class ProductSupplierLinked {}

export class ProductSupplierUnlinked {}

export type LinkProductSupplierResult = ProductSupplierLinked | ProductNotFound | SupplierNotFound;

export class LinkProductSupplier {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly supplierLookup: SupplierLookup,
    private readonly links: ProductSupplierLink,
  ) {}

  async execute(productId: string, supplierId: string): Promise<LinkProductSupplierResult> {
    if ((await this.productRepository.findById(productId)) === null) {
      return new ProductNotFound(productId);
    }
    if (!(await this.supplierLookup.exists(supplierId))) {
      return new SupplierNotFound(supplierId);
    }
    await this.links.link(productId, supplierId);
    return new ProductSupplierLinked();
  }
}

export class UnlinkProductSupplier {
  constructor(private readonly links: ProductSupplierLink) {}

  async execute(productId: string, supplierId: string): Promise<ProductSupplierUnlinked> {
    await this.links.unlink(productId, supplierId);
    return new ProductSupplierUnlinked();
  }
}
