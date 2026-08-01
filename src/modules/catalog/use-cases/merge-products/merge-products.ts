import type { TimeManager } from '#shared/ports/time-manager.js';
import { UnitProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ProductMerger } from '#modules/catalog/ports/product-merger.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';

export class ProductsMerged {
  constructor(readonly winner: Product) {}
}

export class ProductToMergeNotFound {
  constructor(readonly productId: string) {}
}

export class CannotMergeSameProduct {}

// Unidades y kilos no se suman: fusionar tipos de venta distintos corrompería
// el stock. Ese caso se resuelve a mano (desactivar uno).
export class CannotMergeDifferentSaleTypes {}

export type MergeProductsResult =
  | ProductsMerged
  | ProductToMergeNotFound
  | CannotMergeSameProduct
  | CannotMergeDifferentSaleTypes;

export class MergeProducts {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly merger: ProductMerger,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(winnerId: string, loserId: string): Promise<MergeProductsResult> {
    if (winnerId === loserId) {
      return new CannotMergeSameProduct();
    }
    const winner = await this.productRepository.findById(winnerId);
    if (winner === null) {
      return new ProductToMergeNotFound(winnerId);
    }
    const loser = await this.productRepository.findById(loserId);
    if (loser === null) {
      return new ProductToMergeNotFound(loserId);
    }
    if (winner instanceof UnitProduct !== loser instanceof UnitProduct) {
      return new CannotMergeDifferentSaleTypes();
    }

    await this.merger.merge(winnerId, loserId, this.timeManager.now());
    const merged = await this.productRepository.findById(winnerId);
    return new ProductsMerged(merged ?? winner);
  }
}
