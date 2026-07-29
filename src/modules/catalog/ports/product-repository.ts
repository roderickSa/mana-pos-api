import type { Nullable } from '#shared/domain/nullable.js';
import type { Product } from '#modules/catalog/domain/product.js';
import type { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Nullable<Product>>;
  findByBarcode(barcode: string): Promise<Nullable<Product>>;
  findByShortCode(shortCode: string): Promise<Nullable<Product>>;
  search(params: SearchProductsParams): Promise<Product[]>;
  // Total de productos que cumplen los filtros, ignorando limit/offset.
  count(params: SearchProductsParams): Promise<number>;
}
