import { SqliteProductRepository } from '#modules/catalog/infrastructure/repositories/sqlite-product-repository.js';
import { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';
import { UnitProduct, WeightProduct } from '#modules/catalog/domain/product.js';
import { Supplier } from '#modules/suppliers/domain/supplier.js';
import { SqliteSupplierRepository } from '#modules/suppliers/infrastructure/repositories/sqlite-supplier-repository.js';
import {
  createDatabaseClient,
  runMigrations,
  type DatabaseClient,
} from '#shared/infrastructure/database/client.js';
import { unitProductMother, weightProductMother } from '../mothers/product.mother.js';

describe('SqliteProductRepository', () => {
  let db: DatabaseClient;
  let repository: SqliteProductRepository;

  beforeEach(() => {
    db = createDatabaseClient(':memory:');
    runMigrations(db, './drizzle');
    repository = new SqliteProductRepository(db);
  });

  async function seedSupplier(id: string): Promise<void> {
    await new SqliteSupplierRepository(db).save(
      new Supplier(id, `Proveedor ${id}`, null, null, true, new Date('2026-07-01T08:00:00.000Z')),
    );
  }

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

    const byQuery = await repository.search(new SearchProductsParams('inca 600', null, null, false, false, false, false, false, 50, 0));
    expect(byQuery.map((product) => product.id)).toEqual(['p1']);

    const byAccent = await repository.search(new SearchProductsParams('platano', null, null, false, false, false, false, false, 50, 0));
    expect(byAccent.map((product) => product.id)).toEqual(['p3']);

    const activeOnly = await repository.search(new SearchProductsParams('trapo', null, null, false, false, false, false, false, 50, 0));
    expect(activeOnly).toHaveLength(0);

    const quickAccessOnly = await repository.search(new SearchProductsParams(null, null, null, true, false, false, false, false, 50, 0));
    expect(quickAccessOnly.map((product) => product.id)).toEqual(['p3']);
  });

  it('round-trips supplier associations and filters by supplier', async () => {
    await seedSupplier('prov-1');
    await seedSupplier('prov-2');
    await repository.save(unitProductMother({ id: 'p1', barcode: '1', supplierIds: ['prov-1', 'prov-2'] }));
    await repository.save(unitProductMother({ id: 'p2', barcode: '2', supplierIds: ['prov-2'] }));
    await repository.save(unitProductMother({ id: 'p3', barcode: '3' }));

    expect((await repository.findById('p1'))?.supplierIds.sort()).toEqual(['prov-1', 'prov-2']);
    expect((await repository.findById('p3'))?.supplierIds).toEqual([]);

    const ofProv1 = await repository.search(
      new SearchProductsParams(null, null, 'prov-1', false, false, false, false, false, 50, 0),
    );
    expect(ofProv1.map((product) => product.id)).toEqual(['p1']);

    // Reasignar proveedores reemplaza las asociaciones anteriores.
    await repository.save(unitProductMother({ id: 'p1', barcode: '1', supplierIds: ['prov-2'] }));
    expect((await repository.findById('p1'))?.supplierIds).toEqual(['prov-2']);
  });
});
