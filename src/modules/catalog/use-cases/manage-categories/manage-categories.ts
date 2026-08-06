import type { Nullable } from '#shared/domain/nullable.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { Category, slugifyCategoryName } from '#modules/catalog/domain/category.js';
import type { CategoryRepository } from '#modules/catalog/ports/category-repository.js';

export class CreateCategoryInput {
  constructor(readonly name: string) {}
}

export class UpdateCategoryInput {
  constructor(
    readonly slug: string,
    readonly name: Nullable<string>,
    readonly active: Nullable<boolean>,
    // Llaves del set fijo del front; null = sin cambio.
    readonly icon: Nullable<string> = null,
    readonly color: Nullable<string> = null,
  ) {}
}

export class CategorySaved {
  constructor(readonly category: Category) {}
}

export class CategoryNotFound {
  constructor(readonly slug: string) {}
}

export class CategoryAlreadyExists {
  constructor(readonly slug: string) {}
}

export class CategoryNameEmpty {}

export type CreateCategoryResult = CategorySaved | CategoryAlreadyExists | CategoryNameEmpty;
export type UpdateCategoryResult = CategorySaved | CategoryNotFound | CategoryNameEmpty;

export class ListCategories {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(includeInactive: boolean): Promise<Category[]> {
    return this.categoryRepository.list(includeInactive);
  }
}

export class CreateCategory {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreateCategoryInput): Promise<CreateCategoryResult> {
    const name = input.name.trim();
    const slug = slugifyCategoryName(name);
    if (name === '' || slug === '') {
      return new CategoryNameEmpty();
    }
    const existing = await this.categoryRepository.findBySlug(slug);
    if (existing !== null) {
      return new CategoryAlreadyExists(slug);
    }
    const existingAll = await this.categoryRepository.list(true);
    const nextOrder = existingAll.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
    const category = new Category(slug, name, true, nextOrder, null, null, this.timeManager.now());
    await this.categoryRepository.save(category);
    return new CategorySaved(category);
  }
}

export class UpdateCategory {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<UpdateCategoryResult> {
    const category = await this.categoryRepository.findBySlug(input.slug);
    if (category === null) {
      return new CategoryNotFound(input.slug);
    }
    let updated = category;
    if (input.name !== null) {
      const name = input.name.trim();
      if (name === '') {
        return new CategoryNameEmpty();
      }
      updated = updated.rename(name);
    }
    if (input.active !== null) {
      updated = updated.setActive(input.active);
    }
    if (input.icon !== null || input.color !== null) {
      updated = updated.withLook(input.icon ?? updated.icon, input.color ?? updated.color);
    }
    await this.categoryRepository.save(updated);
    return new CategorySaved(updated);
  }
}

export class CategoriesReordered {
  constructor(readonly slugs: string[]) {}
}

// El orden de esta lista ES el orden de las pestañas de Vender.
export class ReorderCategories {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(slugs: string[]): Promise<CategoriesReordered> {
    await this.categoryRepository.saveOrder(slugs);
    return new CategoriesReordered(slugs);
  }
}

export class CategoryDeleted {
  constructor(
    readonly slug: string,
    readonly movedProducts: number,
  ) {}
}

export class ReassignTargetInvalid {
  constructor(readonly reassignTo: string) {}
}

export type DeleteCategoryResult = CategoryDeleted | CategoryNotFound | ReassignTargetInvalid;

export class DeleteCategoryInput {
  constructor(
    readonly slug: string,
    // Los productos nunca quedan huérfanos: siempre migran a otra categoría.
    readonly reassignTo: string,
  ) {}
}

export class DeleteCategory {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: DeleteCategoryInput): Promise<DeleteCategoryResult> {
    const category = await this.categoryRepository.findBySlug(input.slug);
    if (category === null) {
      return new CategoryNotFound(input.slug);
    }
    const target = await this.categoryRepository.findBySlug(input.reassignTo);
    if (target === null || target.slug === category.slug) {
      return new ReassignTargetInvalid(input.reassignTo);
    }
    const moved = await this.categoryRepository.deleteReassigning(category.slug, target.slug);
    return new CategoryDeleted(category.slug, moved);
  }
}
