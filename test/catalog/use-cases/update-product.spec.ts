import { UnitProduct } from '#modules/catalog/domain/product.js';
import { UpdateProduct } from '#modules/catalog/use-cases/update-product/update-product.js';
import { UpdateProductInput } from '#modules/catalog/use-cases/update-product/update-product.input.js';
import { SupplierNotFound } from '#modules/catalog/use-cases/create-product/create-product.output.js';
import {
  BarcodeTakenByAnotherProduct,
  ProductNotFound,
  ProductUpdated,
} from '#modules/catalog/use-cases/update-product/update-product.output.js';
import { unitProductMother } from '../mothers/product.mother.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';
import { SupplierLookupForTesting } from '../test-doubles/supplier-lookup-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('UpdateProduct', () => {
  let repository: ProductRepositoryForTesting;
  let supplierLookup: SupplierLookupForTesting;
  let useCase: UpdateProduct;

  beforeEach(() => {
    repository = new ProductRepositoryForTesting();
    supplierLookup = new SupplierLookupForTesting();
    useCase = new UpdateProduct(repository, supplierLookup, new TimeManagerForTesting());
  });

  it('updates prices keeping stock and creation date', async () => {
    const existing = unitProductMother({ id: 'p1', stockUnits: 17 });
    await repository.save(existing);

    const result = await useCase.execute(
      new UpdateProductInput(
        'p1',
        existing.barcode,
        null,
        'Inca Kola 600ml',
        'bebidas',
        [],
        380,
        300,
        null,
        null,
        6,
        true,
        true,
      ),
    );

    expect(result).toBeInstanceOf(ProductUpdated);
    if (!(result instanceof ProductUpdated)) return;
    expect(result.product).toBeInstanceOf(UnitProduct);
    if (!(result.product instanceof UnitProduct)) return;
    expect(result.product.priceCents).toBe(380);
    expect(result.product.stockUnits).toBe(17);
    expect(result.product.createdAt).toEqual(existing.createdAt);
  });

  it('derives the unit cost from the pack cost when pack data is provided', async () => {
    await repository.save(unitProductMother({ id: 'p1' }));

    const result = await useCase.execute(
      new UpdateProductInput('p1', null, null, 'Inca Kola 600ml', 'bebidas', [], 380, 0, 6, 1800, 6, true, false),
    );

    expect(result).toBeInstanceOf(ProductUpdated);
    if (!(result instanceof ProductUpdated)) return;
    if (!(result.product instanceof UnitProduct)) return;
    expect(result.product.packSize).toBe(6);
    expect(result.product.packCostCents).toBe(1800);
    expect(result.product.costCents).toBe(300);
  });

  it('assigns an existing supplier', async () => {
    supplierLookup.addSupplier('prov-1');
    await repository.save(unitProductMother({ id: 'p1' }));

    const result = await useCase.execute(
      new UpdateProductInput('p1', null, null, 'Inca Kola 600ml', 'bebidas', ['prov-1'], 380, 300, null, null, 6, true, false),
    );

    expect(result).toBeInstanceOf(ProductUpdated);
    if (!(result instanceof ProductUpdated)) return;
    expect(result.product.supplierIds).toEqual(['prov-1']);
  });

  it('rejects an unknown supplier', async () => {
    await repository.save(unitProductMother({ id: 'p1' }));

    const result = await useCase.execute(
      new UpdateProductInput('p1', null, null, 'X', 'bebidas', ['prov-fantasma'], 380, 300, null, null, 6, true, false),
    );

    expect(result).toBeInstanceOf(SupplierNotFound);
  });

  it('returns ProductNotFound for an unknown id', async () => {
    const result = await useCase.execute(
      new UpdateProductInput('missing', null, null, 'X', 'abarrotes', [], 100, 50, null, null, 0, true, false),
    );

    expect(result).toBeInstanceOf(ProductNotFound);
  });

  it('rejects a barcode owned by another product', async () => {
    await repository.save(unitProductMother({ id: 'p1', barcode: '111' }));
    await repository.save(unitProductMother({ id: 'p2', barcode: '222' }));

    const result = await useCase.execute(
      new UpdateProductInput('p2', '111', null, 'Otro', 'bebidas', [], 100, 50, null, null, 0, true, false),
    );

    expect(result).toBeInstanceOf(BarcodeTakenByAnotherProduct);
  });

  it('allows keeping its own barcode', async () => {
    await repository.save(unitProductMother({ id: 'p1', barcode: '111' }));

    const result = await useCase.execute(
      new UpdateProductInput('p1', '111', null, 'Renombrado', 'bebidas', [], 100, 50, null, null, 0, true, false),
    );

    expect(result).toBeInstanceOf(ProductUpdated);
  });
});
