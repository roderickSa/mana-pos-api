import { GetProductByBarcode } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.js';
import { GetProductByBarcodeInput } from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.input.js';
import {
  ProductFoundByBarcode,
  UnknownBarcode,
} from '#modules/catalog/use-cases/get-product-by-barcode/get-product-by-barcode.output.js';
import { unitProductMother } from '../mothers/product.mother.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';

describe('GetProductByBarcode', () => {
  let repository: ProductRepositoryForTesting;
  let useCase: GetProductByBarcode;

  beforeEach(() => {
    repository = new ProductRepositoryForTesting();
    useCase = new GetProductByBarcode(repository);
  });

  it('finds a product by its barcode', async () => {
    const product = unitProductMother({ barcode: '7750182000123' });
    await repository.save(product);

    const result = await useCase.execute(new GetProductByBarcodeInput('7750182000123'));

    expect(result).toBeInstanceOf(ProductFoundByBarcode);
    if (!(result instanceof ProductFoundByBarcode)) return;
    expect(result.product.id).toBe(product.id);
  });

  it('returns UnknownBarcode so the POS can offer quick creation', async () => {
    const result = await useCase.execute(new GetProductByBarcodeInput('0000000000000'));

    expect(result).toBeInstanceOf(UnknownBarcode);
    if (!(result instanceof UnknownBarcode)) return;
    expect(result.barcode).toBe('0000000000000');
  });
});
