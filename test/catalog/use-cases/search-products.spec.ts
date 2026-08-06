import { SearchProducts } from '#modules/catalog/use-cases/search-products/search-products.js';
import { SearchProductsInput } from '#modules/catalog/use-cases/search-products/search-products.input.js';
import { unitProductMother, weightProductMother } from '../mothers/product.mother.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';

describe('SearchProducts', () => {
  let repository: ProductRepositoryForTesting;
  let useCase: SearchProducts;

  beforeEach(async () => {
    repository = new ProductRepositoryForTesting();
    useCase = new SearchProducts(repository);
    await repository.save(unitProductMother({ id: 'p1', name: 'Inca Kola 600ml', barcode: '1' }));
    await repository.save(unitProductMother({ id: 'p2', name: 'Café Altomayo', barcode: '2', category: 'abarrotes' }));
    await repository.save(weightProductMother({ id: 'p3', name: 'Plátano de seda' }));
    await repository.save(unitProductMother({ id: 'p4', name: 'Cerveza Pilsen', barcode: '4', active: false }));
  });

  it('matches ignoring accents and case', async () => {
    const found = await useCase.execute(new SearchProductsInput('CAFE', null, null, false, false, false, false, 'default', false, 50, 0));

    expect(found.items.map((product) => product.id)).toEqual(['p2']);
    expect(found.total).toBe(1);
  });

  it('matches partial multi-token queries', async () => {
    const found = await useCase.execute(new SearchProductsInput('inca 600', null, null, false, false, false, false, 'default', false, 50, 0));

    expect(found.items.map((product) => product.id)).toEqual(['p1']);
  });

  it('filters by category', async () => {
    const found = await useCase.execute(
      new SearchProductsInput(null, 'frutas-verduras', null, false, false, false, false, 'default', false, 50, 0),
    );

    expect(found.items.map((product) => product.id)).toEqual(['p3']);
  });

  it('excludes inactive products by default', async () => {
    const found = await useCase.execute(new SearchProductsInput('pilsen', null, null, false, false, false, false, 'default', false, 50, 0));

    expect(found.items).toHaveLength(0);
  });

  it('treats a blank query as no query filter', async () => {
    const found = await useCase.execute(new SearchProductsInput('   ', null, null, false, false, false, false, 'default', false, 50, 0));

    expect(found.items).toHaveLength(3);
    expect(found.total).toBe(3);
  });
});
