import { eq } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { productLots, products } from '#shared/infrastructure/database/schema.js';
import { ProductLot, ProductLotGroup } from '#modules/inventory/domain/product-lot.js';
import type { LotRepository } from '#modules/inventory/ports/lot-repository.js';

export class SqliteLotRepository implements LotRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(lot: ProductLot): Promise<void> {
    await this.db
      .insert(productLots)
      .values({
        id: lot.id,
        productId: lot.productId,
        quantity: lot.quantity,
        expiryDate: lot.expiryDate,
        createdAt: lot.createdAt,
      })
      .onConflictDoUpdate({
        target: productLots.id,
        set: { quantity: lot.quantity, expiryDate: lot.expiryDate },
      });
  }

  async findById(id: string): Promise<Nullable<ProductLot>> {
    const row = await this.db.query.productLots.findFirst({ where: eq(productLots.id, id) });
    if (row === undefined) return null;
    return new ProductLot(row.id, row.productId, row.quantity, row.expiryDate, row.createdAt);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(productLots).where(eq(productLots.id, id));
  }

  async listGroupsWithLots(): Promise<ProductLotGroup[]> {
    const rows = await this.db
      .select({
        lotId: productLots.id,
        quantity: productLots.quantity,
        expiryDate: productLots.expiryDate,
        createdAt: productLots.createdAt,
        productId: products.id,
        name: products.name,
        saleType: products.saleType,
        stockQuantity: products.stockQuantity,
      })
      .from(productLots)
      .innerJoin(products, eq(productLots.productId, products.id))
      .where(eq(products.active, true))
      .orderBy(productLots.expiryDate);

    const groups = new Map<string, ProductLotGroup>();
    for (const row of rows) {
      const existing = groups.get(row.productId);
      const lot = new ProductLot(row.lotId, row.productId, row.quantity, row.expiryDate, row.createdAt);
      if (existing === undefined) {
        groups.set(
          row.productId,
          new ProductLotGroup(row.productId, row.name, row.saleType, row.stockQuantity, [lot]),
        );
      } else {
        existing.lots.push(lot);
      }
    }
    return [...groups.values()];
  }
}
