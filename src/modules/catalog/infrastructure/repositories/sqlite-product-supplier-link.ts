import { and, eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { productSuppliers } from '#shared/infrastructure/database/schema.js';
import type { ProductSupplierLink } from '#modules/catalog/ports/product-supplier-link.js';

export class SqliteProductSupplierLink implements ProductSupplierLink {
  constructor(private readonly db: DatabaseClient) {}

  async link(productId: string, supplierId: string): Promise<void> {
    await this.db.run(
      sql`INSERT OR IGNORE INTO product_suppliers (product_id, supplier_id) VALUES (${productId}, ${supplierId})`,
    );
  }

  async unlink(productId: string, supplierId: string): Promise<void> {
    await this.db
      .delete(productSuppliers)
      .where(
        and(eq(productSuppliers.productId, productId), eq(productSuppliers.supplierId, supplierId)),
      );
  }
}
