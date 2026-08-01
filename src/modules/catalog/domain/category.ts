import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';

export class Category {
  constructor(
    readonly slug: string,
    readonly name: string,
    readonly active: boolean,
    readonly createdAt: Date,
  ) {}

  rename(name: string): Category {
    return new Category(this.slug, name, this.active, this.createdAt);
  }

  setActive(active: boolean): Category {
    return new Category(this.slug, this.name, active, this.createdAt);
  }
}

// "Frutas y Verduras" → "frutas-y-verduras": el slug es estable, el nombre no.
export function slugifyCategoryName(name: string): string {
  return normalizeSearchText(name).replace(/\s+/g, '-');
}
