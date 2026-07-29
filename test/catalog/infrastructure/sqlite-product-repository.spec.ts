import { SqliteProductRepository } from '#modules/catalog/infrastructure/repositories/sqlite-product-repository.js';
import { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';
import { UnitProduct, WeightProduct } from '#modules/catalog/domain/product.js';
import { createDatabaseClient, runMigrations } from '#shared/infrastructure/database/client.js';
import { unitProductMother, weightProductMother } from '../mothers/product.mother.js';

describe('SqliteProductRepository', () => {
  let repository: SqliteProductRepository;

  beforeEach(() => {
    const db = createDatabaseClient(':memory:');
    runMigrations(db, './drizzle');
    repository = new SqliteProductRepository(db);
  });

  it('round-trips a unit product', async () => {
    const product = unitProductMother({ id: 'p1' });
    await repository.save(product);

    const found = await repository.findById('p1');

    expect(found).toBeInstanceOf(UnitProduct);
    expect(found).toEqual(product);
  });

  it('round-trips a weight product and finds nothing for unknown ids', async () => {
    await repository.save(weightProductMother({ id: 'p2' }));

    expect(await repository.findById('p2')).toBeInstanceOf(WeightProduct);
    expect(await repository.findById('nope')).toBeNull();
  });

  it('updates on save when the id already exists', async () => {
    await repository.save(unitProductMother({ id: 'p1', priceCents: 350 }));
    await repository.save(unitProductMother({ id: 'p1', priceCents: 420 }));

    const found = await repository.findById('p1');

    expect(found).toBeInstanceOf(UnitProduct);
    if (!(found instanceof UnitProduct)) return;
    expect(found.priceCents).toBe(420);
  });

  it('finds by barcode', async () => {
    await repository.save(unitProductMother({ id: 'p1', barcode: '7750182000123' }));

    const found = await repository.findByBarcode('7750182000123');

    expect(found?.id).toBe('p1');
    expect(await repository.findByBarcode('999')).toBeNull();
  });

  it('searches by normalized tokens with filters', async () => {
    await repository.save(unitProductMother({ id: 'p1', name: 'Inca Kola 600ml', barcode: '1' }));
    await repository.save(unitProductMother({ id: 'p2', name: 'Inca Kola 1.5L', barcode: '2' }));
    await repository.save(weightProductMother({ id: 'p3', name: 'Plátano de seda' }));
    await repository.save(unitProductMother({ id: 'p4', name: 'Trapo industrial', barcode: '4', active: false }));

    const byQuery = await repository.search(new SearchProductsParams('inca 600', null, false, false, false, 50, 0));
    expect(byQuery.map((product) => product.id)).toEqual(['p1']);

    const byAccent = await repository.search(new SearchProductsParams('platano', null, false, false, false, 50, 0));
    expect(byAccent.map((product) => product.id)).toEqual(['p3']);

    const activeOnly = await repository.search(new SearchProductsParams('trapo', null, false, false, false, 50, 0));
    expect(activeOnly).toHaveLength(0);

    const quickAccessOnly = await repository.search(new SearchProductsParams(null, null, true, false, false, 50, 0));
    expect(quickAccessOnly.map((product) => product.id)).toEqual(['p3']);
  });
});
