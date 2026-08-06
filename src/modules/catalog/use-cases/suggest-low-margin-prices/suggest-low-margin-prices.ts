import type { Nullable } from '#shared/domain/nullable.js';
import {
  ceilToDime,
  costCentsOf,
  marginPercentOf,
  priceCentsOf,
} from '#modules/catalog/domain/price-change.js';
import { UnitProduct } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
import { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';

const ALL_PRODUCTS = 10000;

export class PriceSuggestion {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly costCents: number,
    readonly priceCents: number,
    readonly suggestedPriceCents: number,
  ) {}

  get marginPercent(): Nullable<number> {
    return marginPercentOf(this.priceCents, this.costCents);
  }

  get suggestedMarginPercent(): Nullable<number> {
    return marginPercentOf(this.suggestedPriceCents, this.costCents);
  }
}

export class LowMarginSuggestions {
  constructor(readonly items: PriceSuggestion[]) {}
}

export class SuggestLowMarginPricesInput {
  constructor(readonly thresholdPercent: number) {}
}

// Productos activos cuyo margen quedó por debajo del umbral (el costo subió y
// el precio no lo siguió). Sugiere el precio que recupera el umbral, redondeado
// HACIA ARRIBA a 10 céntimos para no volver a quedar corto.
export class SuggestLowMarginPrices {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: SuggestLowMarginPricesInput): Promise<LowMarginSuggestions> {
    const products = await this.productRepository.search(
      new SearchProductsParams(null, null, null, false, false, false, false, false, ALL_PRODUCTS, 0),
    );

    const items: PriceSuggestion[] = [];
    for (const product of products) {
      const price = priceCentsOf(product);
      const cost = costCentsOf(product);
      const margin = marginPercentOf(price, cost);
      if (margin === null || margin >= input.thresholdPercent) {
        continue;
      }
      const suggested = ceilToDime(cost / (1 - input.thresholdPercent / 100));
      if (suggested <= price) {
        continue;
      }
      items.push(
        new PriceSuggestion(
          product.id,
          product.name,
          product instanceof UnitProduct ? 'unit' : 'weight',
          cost,
          price,
          suggested,
        ),
      );
    }
    items.sort((a, b) => (a.marginPercent ?? 0) - (b.marginPercent ?? 0));
    return new LowMarginSuggestions(items);
  }
}
