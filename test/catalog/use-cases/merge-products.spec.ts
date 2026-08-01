import type { ProductMerger } from '#modules/catalog/ports/product-merger.js';
import {
  CannotMergeDifferentSaleTypes,
  CannotMergeSameProduct,
  MergeProducts,
  ProductsMerged,
  ProductToMergeNotFound,
} from '#modules/catalog/use-cases/merge-products/merge-products.js';
import {
  AddProductBarcode,
  BarcodeAdded,
} from '#modules/catalog/use-cases/manage-barcodes/manage-barcodes.js';
import { BarcodeAlreadyInUse } from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';
import { unitProductMother, weightProductMother } from '../mothers/product.mother.js';
import { BarcodeAliasRepositoryForTesting } from '../test-doubles/barcode-alias-repository-for-testing.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

class ProductMergerForTesting implements ProductMerger {
  merged: Array<{ winnerId: string; loserId: string; at: Date }> = [];

  async merge(winnerId: string, loserId: string, at: Date): Promise<void> {
    this.merged.push({ winnerId, loserId, at });
  }
}

describe('MergeProducts', () => {
  let repository: ProductRepositoryForTesting;
  let merger: ProductMergerForTesting;
  let useCase: MergeProducts;

  beforeEach(() => {
    repository = new ProductRepositoryForTesting();
    merger = new ProductMergerForTesting();
    useCase = new MergeProducts(repository, merger, new TimeManagerForTesting());
  });

  it('merges the duplicate into the master product', async () => {
    await repository.save(unitProductMother({ id: 'master', barcode: '111' }));
    await repository.save(unitProductMother({ id: 'dup', barcode: '222' }));

    const result = await useCase.execute('master', 'dup');

    expect(result).toBeInstanceOf(ProductsMerged);
    expect(merger.merged).toEqual([
      { winnerId: 'master', loserId: 'dup', at: expect.any(Date) },
    ]);
  });

  it('refuses to merge a product with itself', async () => {
    expect(await useCase.execute('p1', 'p1')).toBeInstanceOf(CannotMergeSameProduct);
    expect(merger.merged).toHaveLength(0);
  });

  it('refuses to merge unit and weight products', async () => {
    await repository.save(unitProductMother({ id: 'unit', barcode: '111' }));
    await repository.save(weightProductMother({ id: 'weight' }));

    expect(await useCase.execute('unit', 'weight')).toBeInstanceOf(CannotMergeDifferentSaleTypes);
    expect(merger.merged).toHaveLength(0);
  });

  it('returns not found when either product is missing', async () => {
    await repository.save(unitProductMother({ id: 'master' }));

    expect(await useCase.execute('master', 'ghost')).toBeInstanceOf(ProductToMergeNotFound);
    expect(await useCase.execute('ghost', 'master')).toBeInstanceOf(ProductToMergeNotFound);
  });
});

describe('AddProductBarcode', () => {
  it('adds an alias and rejects codes already in use', async () => {
    const repository = new ProductRepositoryForTesting();
    const aliases = new BarcodeAliasRepositoryForTesting();
    const useCase = new AddProductBarcode(repository, aliases, new TimeManagerForTesting());
    await repository.save(unitProductMother({ id: 'p1', barcode: '111' }));

    const added = await useCase.execute('p1', '7759990000000');
    expect(added).toBeInstanceOf(BarcodeAdded);
    if (!(added instanceof BarcodeAdded)) return;
    expect(added.barcodes.barcodes).toEqual(['7759990000000']);

    // El principal de otro producto no puede volverse alias.
    expect(await useCase.execute('p1', '111')).toBeInstanceOf(BarcodeAlreadyInUse);
    expect(await useCase.execute('ghost', '333')).toBeInstanceOf(ProductNotFound);
  });
});
