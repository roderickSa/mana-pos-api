import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { suppliers } from '#shared/infrastructure/database/schema.js';
import type { SupplierLookup } from '#modules/catalog/ports/supplier-lookup.js';

export class SqliteSupplierLookup implements SupplierLookup {
  constructor(private readonly db: DatabaseClient) {}

  async exists(supplierId: string): Promise<boolean> {
    const row = await this.db.query.suppliers.findFirst({
      columns: { id: true },
      where: eq(suppliers.id, supplierId),
    });
    return row !== undefined;
  }
}
