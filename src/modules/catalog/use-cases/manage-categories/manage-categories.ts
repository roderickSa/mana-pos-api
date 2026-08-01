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
    const category = new Category(slug, name, true, this.timeManager.now());
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
    await this.categoryRepository.save(updated);
    return new CategorySaved(updated);
  }
}
