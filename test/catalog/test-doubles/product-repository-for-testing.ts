import type { Nullable } from '#shared/domain/nullable.js';
import type { Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';

export class ProductRepositoryForTesting implements ProductRepository {
  private readonly productsById = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.productsById.set(product.id, product);
  }

  async findById(id: string): Promise<Nullable<Product>> {
    return this.productsById.get(id) ?? null;
  }

  async findByShortCode(shortCode: string): Promise<Nullable<Product>> {
    for (const product of this.productsById.values()) {
      if (product.shortCode === shortCode) {
        return product;
      }
    }
    return null;
  }

  async findByBarcode(barcode: string): Promise<Nullable<Product>> {
    for (const product of this.productsById.values()) {
      if (product.barcode === barcode) {
        return product;
      }
    }
    return null;
  }

  async findByNormalizedName(normalizedName: string): Promise<Nullable<Product>> {
    for (const product of this.productsById.values()) {
      if (product.normalizedName === normalizedName) {
        return product;
      }
    }
    return null;
  }

  async count(params: SearchProductsParams): Promise<number> {
    return (await this.filtered(params)).length;
  }

  async search(params: SearchProductsParams): Promise<Product[]> {
    const all = await this.filtered(params);
    return all.slice(params.offset, params.offset + params.limit);
  }

  private async filtered(params: SearchProductsParams): Promise<Product[]> {
    return [...this.productsById.values()].filter((product) => {
      if (!params.includeInactive && !product.active) {
        return false;
      }
      if (params.category !== null && product.category !== params.category) {
        return false;
      }
      if (params.onlyQuickAccess && !product.quickAccess) {
        return false;
      }
      if (params.normalizedQuery !== null) {
        return params.normalizedQuery
          .split(' ')
          .every((token) => product.normalizedName.includes(token));
      }
      return true;
    });
  }

  all(): Product[] {
    return [...this.productsById.values()];
  }
}
