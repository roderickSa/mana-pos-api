import type { TimeManager } from '#shared/ports/time-manager.js';
import { PriceUpdate, type ProductRepository } from '#modules/catalog/ports/product-repository.js';

export class PriceListApplied {
  constructor(readonly count: number) {}
}

export class ProductNotFoundInPriceList {
  constructor(readonly productId: string) {}
}

export class EmptyPriceList {}

export type ApplyPriceListResult = PriceListApplied | ProductNotFoundInPriceList | EmptyPriceList;

export class ApplyPriceListInput {
  constructor(readonly updates: PriceUpdate[]) {}
}

// Aplica los precios elegidos de la lista de sugerencias por margen. Valida
// que cada producto exista antes de tocar nada.
export class ApplyPriceList {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ApplyPriceListInput): Promise<ApplyPriceListResult> {
    if (input.updates.length === 0) {
      return new EmptyPriceList();
    }
    for (const update of input.updates) {
      const product = await this.productRepository.findById(update.productId);
      if (product === null) {
        return new ProductNotFoundInPriceList(update.productId);
      }
    }
    await this.productRepository.updatePrices(input.updates, this.timeManager.now());
    return new PriceListApplied(input.updates.length);
  }
}
