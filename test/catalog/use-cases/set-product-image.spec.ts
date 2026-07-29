import {
  RemoveProductImage,
  SetProductImage,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.js';
import {
  RemoveProductImageInput,
  SetProductImageInput,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.input.js';
import {
  ProductImageRemoved,
  ProductImageSet,
} from '#modules/catalog/use-cases/set-product-image/set-product-image.output.js';
import { ProductNotFound } from '#modules/catalog/use-cases/update-product/update-product.output.js';
import { unitProductMother } from '../mothers/product.mother.js';
import { ImageStoreForTesting } from '../test-doubles/image-store-for-testing.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('SetProductImage', () => {
  let repository: ProductRepositoryForTesting;
  let imageStore: ImageStoreForTesting;
  let useCase: SetProductImage;

  beforeEach(() => {
    repository = new ProductRepositoryForTesting();
    imageStore = new ImageStoreForTesting();
    useCase = new SetProductImage(repository, imageStore, new TimeManagerForTesting());
  });

  it('stores the image and updates the product path', async () => {
    await repository.save(unitProductMother({ id: 'p1' }));

    const result = await useCase.execute(new SetProductImageInput('p1', Buffer.from('img'), 'png'));

    expect(result).toBeInstanceOf(ProductImageSet);
    if (!(result instanceof ProductImageSet)) return;
    expect(result.product.imagePath).toBe('/images/p1.png');
    expect((await repository.findById('p1'))?.imagePath).toBe('/images/p1.png');
  });

  it('replaces a previous image removing the old file', async () => {
    await repository.save(unitProductMother({ id: 'p1', imagePath: '/images/vieja.png' }));

    await useCase.execute(new SetProductImageInput('p1', Buffer.from('img'), 'webp'));

    expect(imageStore.removed).toEqual(['/images/vieja.png']);
    expect((await repository.findById('p1'))?.imagePath).toBe('/images/p1.webp');
  });

  it('returns ProductNotFound for unknown products', async () => {
    const result = await useCase.execute(
      new SetProductImageInput('nope', Buffer.from('img'), 'png'),
    );

    expect(result).toBeInstanceOf(ProductNotFound);
    expect(imageStore.saved).toHaveLength(0);
  });
});

describe('RemoveProductImage', () => {
  it('removes the image and clears the path', async () => {
    const repository = new ProductRepositoryForTesting();
    const imageStore = new ImageStoreForTesting();
    const useCase = new RemoveProductImage(repository, imageStore, new TimeManagerForTesting());
    await repository.save(unitProductMother({ id: 'p1', imagePath: '/images/p1.png' }));

    const result = await useCase.execute(new RemoveProductImageInput('p1'));

    expect(result).toBeInstanceOf(ProductImageRemoved);
    expect(imageStore.removed).toEqual(['/images/p1.png']);
    expect((await repository.findById('p1'))?.imagePath).toBeNull();
  });
});
