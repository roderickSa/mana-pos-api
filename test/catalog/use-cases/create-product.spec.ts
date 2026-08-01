import { UnitProduct, WeightProduct } from '#modules/catalog/domain/product.js';
import { CreateProduct } from '#modules/catalog/use-cases/create-product/create-product.js';
import {
  CreateUnitProductInput,
  CreateWeightProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
  NameAlreadyInUse,
  ProductCreated,
  SupplierNotFound,
} from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { unitProductMother } from '../mothers/product.mother.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';
import { SupplierLookupForTesting } from '../test-doubles/supplier-lookup-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('CreateProduct', () => {
  let repository: ProductRepositoryForTesting;
  let supplierLookup: SupplierLookupForTesting;
  let useCase: CreateProduct;

  beforeEach(() => {
    repository = new ProductRepositoryForTesting();
    supplierLookup = new SupplierLookupForTesting();
    useCase = new CreateProduct(
      repository,
      supplierLookup,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
  });

  it('creates a unit product with zero stock and normalized name', async () => {
    const result = await useCase.execute(
      new CreateUnitProductInput(
        '7750182000456',
        null,
        'Café Altomayo 50g',
        'abarrotes',
        [],
        890,
        650,
        null,
        null,
        3,
        false,
        false,
      ),
    );

    expect(result).toBeInstanceOf(ProductCreated);
    if (!(result instanceof ProductCreated)) return;
    expect(result.product).toBeInstanceOf(UnitProduct);
    if (!(result.product instanceof UnitProduct)) return;
    expect(result.product.normalizedName).toBe('cafe altomayo 50g');
    expect(result.product.stockUnits).toBe(0);
    expect(result.product.active).toBe(true);
    expect(repository.all()).toHaveLength(1);
  });

  it('derives the unit cost from the pack cost when pack data is provided', async () => {
    const result = await useCase.execute(
      new CreateUnitProductInput(null, null, 'Agua San Luis 625ml', 'bebidas', [], 150, 0, 15, 1650, 5, false, false),
    );

    expect(result).toBeInstanceOf(ProductCreated);
    if (!(result instanceof ProductCreated)) return;
    if (!(result.product instanceof UnitProduct)) return;
    expect(result.product.packSize).toBe(15);
    expect(result.product.packCostCents).toBe(1650);
    expect(result.product.costCents).toBe(110);
  });

  it('creates a weight product without barcode', async () => {
    const result = await useCase.execute(
      new CreateWeightProductInput(null, null, 'Plátano de seda', 'frutas-verduras', [], 280, 180, 500, true, false),
    );

    expect(result).toBeInstanceOf(ProductCreated);
    if (!(result instanceof ProductCreated)) return;
    expect(result.product).toBeInstanceOf(WeightProduct);
    if (!(result.product instanceof WeightProduct)) return;
    expect(result.product.barcode).toBeNull();
    expect(result.product.normalizedName).toBe('platano de seda');
    expect(result.product.stockGrams).toBe(0);
  });

  it('creates a product linked to an existing supplier', async () => {
    supplierLookup.addSupplier('prov-1');

    const result = await useCase.execute(
      new CreateUnitProductInput(null, null, 'Yogurt Gloria', 'abarrotes', ['prov-1'], 550, 430, null, null, 2, false, false),
    );

    expect(result).toBeInstanceOf(ProductCreated);
    if (!(result instanceof ProductCreated)) return;
    expect(result.product.supplierIds).toEqual(['prov-1']);
  });

  it('rejects an unknown supplier', async () => {
    const result = await useCase.execute(
      new CreateUnitProductInput(null, null, 'Yogurt Gloria', 'abarrotes', ['prov-fantasma'], 550, 430, null, null, 2, false, false),
    );

    expect(result).toBeInstanceOf(SupplierNotFound);
    expect(repository.all()).toHaveLength(0);
  });

  it('warns when another product already has the same normalized name', async () => {
    await repository.save(unitProductMother({ id: 'p1', name: 'Inca Kola 600ml', barcode: '111' }));

    const result = await useCase.execute(
      new CreateUnitProductInput(null, null, 'INCA KOLA 600ML', 'bebidas', [], 350, 280, null, null, 0, false, false),
    );

    expect(result).toBeInstanceOf(NameAlreadyInUse);
    if (!(result instanceof NameAlreadyInUse)) return;
    expect(result.existingProductId).toBe('p1');
    expect(repository.all()).toHaveLength(1);
  });

  it('creates the duplicate when the user explicitly confirms', async () => {
    await repository.save(unitProductMother({ id: 'p1', name: 'Inca Kola 600ml', barcode: '111' }));

    const result = await useCase.execute(
      new CreateUnitProductInput(null, null, 'Inca Kola 600ml', 'bebidas', [], 350, 280, null, null, 0, false, true),
    );

    expect(result).toBeInstanceOf(ProductCreated);
    expect(repository.all()).toHaveLength(2);
  });

  it('rejects a barcode that is already in use', async () => {
    await repository.save(unitProductMother({ barcode: '7750182000123' }));

    const result = await useCase.execute(
      new CreateUnitProductInput('7750182000123', null, 'Otra gaseosa', 'bebidas', [], 300, 200, null, null, 0, false, false),
    );

    expect(result).toBeInstanceOf(BarcodeAlreadyInUse);
    expect(repository.all()).toHaveLength(1);
  });
});
