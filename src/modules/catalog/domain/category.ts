import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';
import type { Nullable } from '#shared/domain/nullable.js';

export class Category {
  constructor(
    readonly slug: string,
    readonly name: string,
    readonly active: boolean,
    // Posición en las pestañas de Vender y en los selects.
    readonly sortOrder: number,
    // Llaves del set fijo del front; null = apariencia por defecto.
    readonly icon: Nullable<string>,
    readonly color: Nullable<string>,
    readonly createdAt: Date,
  ) {}

  rename(name: string): Category {
    return new Category(this.slug, name, this.active, this.sortOrder, this.icon, this.color, this.createdAt);
  }

  setActive(active: boolean): Category {
    return new Category(this.slug, this.name, active, this.sortOrder, this.icon, this.color, this.createdAt);
  }

  withLook(icon: Nullable<string>, color: Nullable<string>): Category {
    return new Category(this.slug, this.name, this.active, this.sortOrder, icon, color, this.createdAt);
  }

  withSortOrder(sortOrder: number): Category {
    return new Category(this.slug, this.name, this.active, sortOrder, this.icon, this.color, this.createdAt);
  }
}

// "Frutas y Verduras" → "frutas-y-verduras": el slug es estable, el nombre no.
export function slugifyCategoryName(name: string): string {
  return normalizeSearchText(name).replace(/\s+/g, '-');
}
