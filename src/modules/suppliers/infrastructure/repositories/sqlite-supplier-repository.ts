import { eq } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { suppliers } from '#shared/infrastructure/database/schema.js';
import { Supplier } from '#modules/suppliers/domain/supplier.js';
import type { SupplierRepository } from '#modules/suppliers/ports/supplier-repository.js';

type SupplierRow = typeof suppliers.$inferSelect;

export class SqliteSupplierRepository implements SupplierRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(supplier: Supplier): Promise<void> {
    const row = this.toRow(supplier);
    await this.db.insert(suppliers).values(row).onConflictDoUpdate({ target: suppliers.id, set: row });
  }

  async findById(id: string): Promise<Nullable<Supplier>> {
    const row = await this.db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
    return row === undefined ? null : this.toEntity(row);
  }

  async findAll(): Promise<Supplier[]> {
    const rows = await this.db.select().from(suppliers).orderBy(suppliers.name);
    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: SupplierRow): Supplier {
    return new Supplier(
      row.id,
      row.name,
      row.phone,
      row.notes,
      row.visitDays === null || row.visitDays === '' ? [] : row.visitDays.split(','),
      row.contactName,
      row.paymentTerms,
      row.active,
      row.createdAt,
    );
  }

  private toRow(supplier: Supplier): SupplierRow {
    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      notes: supplier.notes,
      visitDays: supplier.visitDays.length === 0 ? null : supplier.visitDays.join(','),
      contactName: supplier.contactName,
      paymentTerms: supplier.paymentTerms,
      active: supplier.active,
      createdAt: supplier.createdAt,
    };
  }
}
