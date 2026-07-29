import { UnitProduct } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { Nullable } from '#shared/domain/nullable.js';
import { ForSaleProduct, type ProductCatalog } from '#modules/sales/ports/product-catalog.js';

// Adapter: expone el catálogo real (módulo catalog) con la vista mínima que usa sales.
export class CatalogProductCatalog implements ProductCatalog {
  constructor(private readonly productRepository: ProductRepository) {}

  async findForSale(productId: string): Promise<Nullable<ForSaleProduct>> {
    const product = await this.productRepository.findById(productId);
    if (product === null) {
      return null;
    }
    if (product instanceof UnitProduct) {
      return new ForSaleProduct(product.id, product.name, 'unit', product.priceCents, product.active);
    }
    return new ForSaleProduct(product.id, product.name, 'weight', product.pricePerKgCents, product.active);
  }
}
