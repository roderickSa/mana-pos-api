import type { Nullable } from '#shared/domain/nullable.js';
import type { Category } from '#modules/catalog/domain/category.js';

export interface CategoryRepository {
  list(includeInactive: boolean): Promise<Category[]>;
  findBySlug(slug: string): Promise<Nullable<Category>>;
  save(category: Category): Promise<void>;
  // Fija sortOrder = posición en la lista (transacción única).
  saveOrder(slugs: string[]): Promise<void>;
  // Mueve los productos a otra categoría y borra la fila; devuelve cuántos migró.
  deleteReassigning(slug: string, reassignToSlug: string): Promise<number>;
  countProducts(slug: string): Promise<number>;
}
