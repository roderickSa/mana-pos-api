import type { Nullable } from '#shared/domain/nullable.js';
import type { Product } from '#modules/catalog/domain/product.js';
import type { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';

export class PriceUpdate {
  constructor(
    readonly productId: string,
    readonly priceCents: number,
  ) {}
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Nullable<Product>>;
  findByBarcode(barcode: string): Promise<Nullable<Product>>;
  findByShortCode(shortCode: string): Promise<Nullable<Product>>;
  // Para detectar duplicados al crear: mismo nombre normalizado.
  findByNormalizedName(normalizedName: string): Promise<Nullable<Product>>;
  search(params: SearchProductsParams): Promise<Product[]>;
  // Total de productos que cumplen los filtros, ignorando limit/offset.
  count(params: SearchProductsParams): Promise<number>;
  // Cambio masivo de precios en una sola transacción.
  updatePrices(updates: PriceUpdate[], at: Date): Promise<void>;
}
