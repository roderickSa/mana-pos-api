import type { TimeManager } from '#shared/ports/time-manager.js';
import {
  PriceChange,
  costCentsOf,
  priceCentsOf,
  roundToDime,
} from '#modules/catalog/domain/price-change.js';
import { UnitProduct, type Product } from '#modules/catalog/domain/product.js';
import { PriceUpdate, type ProductRepository } from '#modules/catalog/ports/product-repository.js';
import { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';
import type { BulkUpdatePricesInput } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.input.js';
import {
  NoProductsToUpdate,
  PriceChangesPreviewed,
  PricesApplied,
  type BulkUpdatePricesResult,
} from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.output.js';

// Un precio nunca baja de 10 céntimos por un cambio masivo.
const MIN_PRICE_CENTS = 10;
const ALL_PRODUCTS = 10000;

export class BulkUpdatePrices {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: BulkUpdatePricesInput): Promise<BulkUpdatePricesResult> {
    const products = await this.productRepository.search(
      new SearchProductsParams(
        null,
        input.category,
        input.supplierId,
        false,
        false,
        false,
        false,
        false,
        ALL_PRODUCTS,
        0,
      ),
    );

    const changes = products
      .map((product) => this.toChange(product, input))
      .filter((change) => change.oldPriceCents !== change.newPriceCents);
    if (changes.length === 0) {
      return new NoProductsToUpdate();
    }

    if (!input.apply) {
      return new PriceChangesPreviewed(changes);
    }
    await this.productRepository.updatePrices(
      changes.map((change) => new PriceUpdate(change.productId, change.newPriceCents)),
      this.timeManager.now(),
    );
    return new PricesApplied(changes);
  }

  private toChange(product: Product, input: BulkUpdatePricesInput): PriceChange {
    const oldPrice = priceCentsOf(product);
    const raw =
      input.mode === 'percent' ? oldPrice * (1 + input.value / 100) : oldPrice + input.value;
    const newPrice = Math.max(MIN_PRICE_CENTS, roundToDime(raw));
    return new PriceChange(
      product.id,
      product.name,
      product instanceof UnitProduct ? 'unit' : 'weight',
      costCentsOf(product),
      oldPrice,
      newPrice,
    );
  }
}
