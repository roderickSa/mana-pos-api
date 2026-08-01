import type { Nullable } from '#shared/domain/nullable.js';
import {
  PurchasableProduct,
  type PurchaseProductLookup,
} from '#modules/purchases/ports/purchase-product-lookup.js';

export class PurchaseProductLookupForTesting implements PurchaseProductLookup {
  private readonly products = new Map<string, PurchasableProduct>();

  addProduct(id: string, name: string, saleType: 'unit' | 'weight' = 'unit'): void {
    this.products.set(id, new PurchasableProduct(id, name, saleType));
  }

  async findById(productId: string): Promise<Nullable<PurchasableProduct>> {
    return this.products.get(productId) ?? null;
  }
}
