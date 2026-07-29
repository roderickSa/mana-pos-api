import type { Nullable } from '#shared/domain/nullable.js';
import { normalizeSearchText } from '#modules/catalog/domain/normalize-search-text.js';
import type { Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';
import type { SearchProductsInput } from '#modules/catalog/use-cases/search-products/search-products.input.js';

export class ProductsPage {
  constructor(
    readonly items: Product[],
    readonly total: number,
  ) {}
}

export class SearchProducts {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: SearchProductsInput): Promise<ProductsPage> {
    const params = new SearchProductsParams(
      this.normalizeQuery(input.query),
      input.category,
      input.onlyQuickAccess,
      input.includeInactive,
      input.orderBySales,
      input.limit,
      input.offset,
    );
    const [items, total] = await Promise.all([
      this.productRepository.search(params),
      this.productRepository.count(params),
    ]);
    return new ProductsPage(items, total);
  }

  private normalizeQuery(query: Nullable<string>): Nullable<string> {
    if (query === null) {
      return null;
    }
    const normalized = normalizeSearchText(query);
    return normalized === '' ? null : normalized;
  }
}
