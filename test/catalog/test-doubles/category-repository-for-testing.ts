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
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async findBySlug(slug: string): Promise<Nullable<Category>> {
    return this.bySlug.get(slug) ?? null;
  }

  async save(category: Category): Promise<void> {
    this.bySlug.set(category.slug, category);
  }

  async saveOrder(slugs: string[]): Promise<void> {
    for (const [index, slug] of slugs.entries()) {
      const category = this.bySlug.get(slug);
      if (category !== undefined) this.bySlug.set(slug, category.withSortOrder(index));
    }
  }

  async deleteReassigning(slug: string, reassignToSlug: string): Promise<number> {
    const moved = this.productCounts.get(slug) ?? 0;
    this.productCounts.set(reassignToSlug, (this.productCounts.get(reassignToSlug) ?? 0) + moved);
    this.bySlug.delete(slug);
    this.productCounts.delete(slug);
    return moved;
  }

  async countProducts(slug: string): Promise<number> {
    return this.productCounts.get(slug) ?? 0;
  }
}
