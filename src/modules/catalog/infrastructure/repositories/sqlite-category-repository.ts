import { asc, eq, sql } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { categories, products } from '#shared/infrastructure/database/schema.js';
import { Category } from '#modules/catalog/domain/category.js';
import type { CategoryRepository } from '#modules/catalog/ports/category-repository.js';

type CategoryRow = typeof categories.$inferSelect;

function toEntity(row: CategoryRow): Category {
  return new Category(row.slug, row.name, row.active, row.sortOrder, row.icon, row.color, row.createdAt);
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DatabaseClient) {}

  async list(includeInactive: boolean): Promise<Category[]> {
    const order = [asc(categories.sortOrder), asc(categories.name)];
    const rows = await (includeInactive
      ? this.db.select().from(categories).orderBy(...order)
      : this.db.select().from(categories).where(eq(categories.active, true)).orderBy(...order));
    return rows.map(toEntity);
  }

  async findBySlug(slug: string): Promise<Nullable<Category>> {
    const row = await this.db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    return row === undefined ? null : toEntity(row);
  }

  async save(category: Category): Promise<void> {
    const row = {
      slug: category.slug,
      name: category.name,
      active: category.active,
      sortOrder: category.sortOrder,
      icon: category.icon,
      color: category.color,
      createdAt: category.createdAt,
    };
    await this.db
      .insert(categories)
      .values(row)
      .onConflictDoUpdate({ target: categories.slug, set: row });
  }

  async saveOrder(slugs: string[]): Promise<void> {
    this.db.transaction((tx) => {
      for (const [index, slug] of slugs.entries()) {
        tx.update(categories).set({ sortOrder: index }).where(eq(categories.slug, slug)).run();
      }
    });
  }

  // Mueve los productos a otra categoría y borra la fila. Devuelve cuántos migró.
  async deleteReassigning(slug: string, reassignToSlug: string): Promise<number> {
    let moved = 0;
    this.db.transaction((tx) => {
      const result = tx
        .update(products)
        .set({ category: reassignToSlug })
        .where(eq(products.category, slug))
        .run();
      moved = result.changes;
      tx.delete(categories).where(eq(categories.slug, slug)).run();
    });
    return moved;
  }

  async countProducts(slug: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(products)
      .where(eq(products.category, slug));
    return rows[0]?.value ?? 0;
  }
}
