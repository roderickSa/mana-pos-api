import type { Nullable } from '#shared/domain/nullable.js';
import type { Category } from '#modules/catalog/domain/category.js';
import type { CategoryRepository } from '#modules/catalog/ports/category-repository.js';

export class CategoryRepositoryForTesting implements CategoryRepository {
  private readonly bySlug = new Map<string, Category>();
  private readonly productCounts = new Map<string, number>();

  seed(category: Category, productCount = 0): void {
    this.bySlug.set(category.slug, category);
    this.productCounts.set(category.slug, productCount);
  }

  async list(includeInactive: boolean): Promise<Category[]> {
    return [...this.bySlug.values()]
      .filter((category) => includeInactive || category.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findBySlug(slug: string): Promise<Nullable<Category>> {
    return this.bySlug.get(slug) ?? null;
  }

  async save(category: Category): Promise<void> {
    this.bySlug.set(category.slug, category);
  }

  async countProducts(slug: string): Promise<number> {
    return this.productCounts.get(slug) ?? 0;
  }
}
