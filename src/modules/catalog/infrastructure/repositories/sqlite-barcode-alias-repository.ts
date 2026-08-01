import { eq, and } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { productBarcodes } from '#shared/infrastructure/database/schema.js';
import type { BarcodeAliasRepository } from '#modules/catalog/ports/barcode-alias-repository.js';

export class SqliteBarcodeAliasRepository implements BarcodeAliasRepository {
  constructor(private readonly db: DatabaseClient) {}

  async listByProduct(productId: string): Promise<string[]> {
    const rows = await this.db
      .select({ barcode: productBarcodes.barcode })
      .from(productBarcodes)
      .where(eq(productBarcodes.productId, productId))
      .orderBy(productBarcodes.createdAt);
    return rows.map((row) => row.barcode);
  }

  async ownerOf(barcode: string): Promise<Nullable<string>> {
    const row = await this.db.query.productBarcodes.findFirst({
      where: eq(productBarcodes.barcode, barcode),
    });
    return row?.productId ?? null;
  }

  async add(productId: string, barcode: string, at: Date): Promise<void> {
    await this.db.insert(productBarcodes).values({ barcode, productId, createdAt: at });
  }

  async remove(productId: string, barcode: string): Promise<void> {
    await this.db
      .delete(productBarcodes)
      .where(and(eq(productBarcodes.productId, productId), eq(productBarcodes.barcode, barcode)));
  }
}
