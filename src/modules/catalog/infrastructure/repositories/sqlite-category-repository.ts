import { eq, sql } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { categories, products } from '#shared/infrastructure/database/schema.js';
import { Category } from '#modules/catalog/domain/category.js';
import type { CategoryRepository } from '#modules/catalog/ports/category-repository.js';

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DatabaseClient) {}

  async list(includeInactive: boolean): Promise<Category[]> {
    const rows = await (includeInactive
      ? this.db.select().from(categories).orderBy(categories.name)
      : this.db.select().from(categories).where(eq(categories.active, true)).orderBy(categories.name));
    return rows.map((row) => new Category(row.slug, row.name, row.active, row.createdAt));
  }

  async findBySlug(slug: string): Promise<Nullable<Category>> {
    const row = await this.db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    return row === undefined ? null : new Category(row.slug, row.name, row.active, row.createdAt);
  }

  async save(category: Category): Promise<void> {
    const row = {
      slug: category.slug,
      name: category.name,
      active: category.active,
      createdAt: category.createdAt,
    };
    await this.db
      .insert(categories)
      .values(row)
      .onConflictDoUpdate({ target: categories.slug, set: row });
  }

  async countProducts(slug: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(products)
      .where(eq(products.category, slug));
    return rows[0]?.value ?? 0;
  }
}
