import type { Nullable } from '#shared/domain/nullable.js';
import type { Category } from '#modules/catalog/domain/category.js';

export interface CategoryRepository {
  list(includeInactive: boolean): Promise<Category[]>;
  findBySlug(slug: string): Promise<Nullable<Category>>;
  save(category: Category): Promise<void>;
  countProducts(slug: string): Promise<number>;
}
