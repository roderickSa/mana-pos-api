import { Category, slugifyCategoryName } from '#modules/catalog/domain/category.js';
import {
  CategoryAlreadyExists,
  CategoryNotFound,
  CategorySaved,
  CreateCategory,
  CreateCategoryInput,
  ListCategories,
  UpdateCategory,
  UpdateCategoryInput,
} from '#modules/catalog/use-cases/manage-categories/manage-categories.js';
import { CategoryRepositoryForTesting } from '../test-doubles/category-repository-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('slugifyCategoryName', () => {
  it('normalizes accents, case and spaces', () => {
    expect(slugifyCategoryName('Frutas y Verduras')).toBe('frutas-y-verduras');
    expect(slugifyCategoryName('  Panadería  ')).toBe('panaderia');
  });
});

describe('CreateCategory', () => {
  it('creates a category with a stable slug', async () => {
    const repository = new CategoryRepositoryForTesting();
    const useCase = new CreateCategory(repository, new TimeManagerForTesting());

    const result = await useCase.execute(new CreateCategoryInput('Golosinas'));

    expect(result).toBeInstanceOf(CategorySaved);
    if (!(result instanceof CategorySaved)) return;
    expect(result.category.slug).toBe('golosinas');
    expect(result.category.active).toBe(true);
  });

  it('rejects duplicated names by slug', async () => {
    const repository = new CategoryRepositoryForTesting();
    repository.seed(new Category('golosinas', 'Golosinas', true, 0, null, null, new Date()));
    const useCase = new CreateCategory(repository, new TimeManagerForTesting());

    const result = await useCase.execute(new CreateCategoryInput('GOLOSINAS'));

    expect(result).toBeInstanceOf(CategoryAlreadyExists);
  });
});

describe('UpdateCategory', () => {
  it('renames keeping the slug and toggles active', async () => {
    const repository = new CategoryRepositoryForTesting();
    repository.seed(new Category('pan', 'Pan', true, 0, null, null, new Date()));
    const useCase = new UpdateCategory(repository);

    const renamed = await useCase.execute(new UpdateCategoryInput('pan', 'Panadería', null));
    expect(renamed).toBeInstanceOf(CategorySaved);
    if (!(renamed instanceof CategorySaved)) return;
    expect(renamed.category.slug).toBe('pan');
    expect(renamed.category.name).toBe('Panadería');

    const deactivated = await useCase.execute(new UpdateCategoryInput('pan', null, false));
    expect(deactivated).toBeInstanceOf(CategorySaved);
    if (!(deactivated instanceof CategorySaved)) return;
    expect(deactivated.category.active).toBe(false);
  });

  it('returns CategoryNotFound for unknown slugs', async () => {
    const useCase = new UpdateCategory(new CategoryRepositoryForTesting());
    const result = await useCase.execute(new UpdateCategoryInput('nope', 'X', null));
    expect(result).toBeInstanceOf(CategoryNotFound);
  });
});

describe('ListCategories', () => {
  it('filters inactive categories unless asked', async () => {
    const repository = new CategoryRepositoryForTesting();
    repository.seed(new Category('pan', 'Pan', true, 0, null, null, new Date()));
    repository.seed(new Category('golosinas', 'Golosinas', false, 0, null, null, new Date()));
    const useCase = new ListCategories(repository);

    expect((await useCase.execute(false)).map((c) => c.slug)).toEqual(['pan']);
    expect((await useCase.execute(true)).map((c) => c.slug)).toEqual(['golosinas', 'pan']);
  });
});
