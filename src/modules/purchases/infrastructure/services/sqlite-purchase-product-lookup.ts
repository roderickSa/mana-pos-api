import { eq } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { products } from '#shared/infrastructure/database/schema.js';
import {
  PurchasableProduct,
  type PurchaseProductLookup,
} from '#modules/purchases/ports/purchase-product-lookup.js';

export class SqlitePurchaseProductLookup implements PurchaseProductLookup {
  constructor(private readonly db: DatabaseClient) {}

  async findById(productId: string): Promise<Nullable<PurchasableProduct>> {
    const row = await this.db.query.products.findFirst({
      columns: { id: true, name: true, saleType: true },
      where: eq(products.id, productId),
    });
    return row === undefined ? null : new PurchasableProduct(row.id, row.name, row.saleType);
  }
}
