import { BulkUpdatePrices } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.js';
import { BulkUpdatePricesInput } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.input.js';
import {
  NoProductsToUpdate,
  PriceChangesPreviewed,
  PricesApplied,
} from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.output.js';
import {
  SuggestLowMarginPrices,
  SuggestLowMarginPricesInput,
} from '#modules/catalog/use-cases/suggest-low-margin-prices/suggest-low-margin-prices.js';
import {
  ApplyPriceList,
  ApplyPriceListInput,
  PriceListApplied,
  ProductNotFoundInPriceList,
} from '#modules/catalog/use-cases/apply-price-list/apply-price-list.js';
import { PriceUpdate } from '#modules/catalog/ports/product-repository.js';
import { UnitProduct } from '#modules/catalog/domain/product.js';
import { ProductRepositoryForTesting } from '../test-doubles/product-repository-for-testing.js';
import { unitProductMother, weightProductMother } from '../mothers/product.mother.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('Bulk price update and low-margin suggestions', () => {
  let repository: ProductRepositoryForTesting;
  let bulkUpdate: BulkUpdatePrices;
  let suggest: SuggestLowMarginPrices;
  let applyList: ApplyPriceList;

  beforeEach(async () => {
    repository = new ProductRepositoryForTesting();
    bulkUpdate = new BulkUpdatePrices(repository, new TimeManagerForTesting());
    suggest = new SuggestLowMarginPrices(repository);
    applyList = new ApplyPriceList(repository, new TimeManagerForTesting());
    // 350/280 = margen 20%; 500/450 = margen 10% (bajo); pesable 900/700.
    await repository.save(unitProductMother({ id: 'gaseosa', priceCents: 350, costCents: 280 }));
    await repository.save(
      unitProductMother({
        id: 'aceite',
        name: 'Aceite Primor',
        barcode: null,
        category: 'abarrotes',
        priceCents: 500,
        costCents: 450,
      }),
    );
    await repository.save(
      weightProductMother({ id: 'papaya', pricePerKgCents: 900, costPerKgCents: 700 }),
    );
  });

  it('previews a percent raise with dime rounding without touching prices', async () => {
    const result = await bulkUpdate.execute(
      new BulkUpdatePricesInput(null, null, 'percent', 5, false),
    );

    expect(result).toBeInstanceOf(PriceChangesPreviewed);
    if (!(result instanceof PriceChangesPreviewed)) return;
    // 350×1.05=367.5→370 · 500×1.05=525→530 · 900×1.05=945→950
    expect(result.changes.map((change) => change.newPriceCents)).toEqual([370, 530, 950]);
    const gaseosa = repository.all().find((product) => product.id === 'gaseosa');
    expect(gaseosa instanceof UnitProduct && gaseosa.priceCents).toBe(350);
  });

  it('applies an amount change only to the filtered category', async () => {
    const result = await bulkUpdate.execute(
      new BulkUpdatePricesInput('abarrotes', null, 'amount', 20, true),
    );

    expect(result).toBeInstanceOf(PricesApplied);
    if (!(result instanceof PricesApplied)) return;
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.newPriceCents).toBe(520);
    const aceite = repository.all().find((product) => product.id === 'aceite');
    expect(aceite instanceof UnitProduct && aceite.priceCents).toBe(520);
  });

  it('never drops a price below 10 cents and reports nothing when no change', async () => {
    const floor = await bulkUpdate.execute(
      new BulkUpdatePricesInput(null, null, 'amount', -100000, false),
    );
    expect(floor).toBeInstanceOf(PriceChangesPreviewed);
    if (floor instanceof PriceChangesPreviewed) {
      expect(floor.changes.every((change) => change.newPriceCents === 10)).toBe(true);
    }

    const untouched = await bulkUpdate.execute(
      new BulkUpdatePricesInput('categoria-fantasma', null, 'percent', 5, false),
    );
    expect(untouched).toBeInstanceOf(NoProductsToUpdate);
  });

  it('suggests dime-ceiled prices only for products below the margin threshold', async () => {
    const result = await suggest.execute(new SuggestLowMarginPricesInput(20));

    // gaseosa está exactamente en 20% (no aparece); papaya 22% (no); aceite 10% sí.
    expect(result.items.map((item) => item.productId)).toEqual(['aceite']);
    // 450/(1−0.20)=562.5 → techo a 570.
    expect(result.items[0]?.suggestedPriceCents).toBe(570);
    const margin = result.items[0]?.suggestedMarginPercent;
    expect(margin !== null && margin !== undefined && margin >= 20).toBe(true);
  });

  it('applies a chosen price list and rejects unknown products', async () => {
    const applied = await applyList.execute(
      new ApplyPriceListInput([new PriceUpdate('aceite', 570)]),
    );
    expect(applied).toBeInstanceOf(PriceListApplied);
    const aceite = repository.all().find((product) => product.id === 'aceite');
    expect(aceite instanceof UnitProduct && aceite.priceCents).toBe(570);

    const unknown = await applyList.execute(
      new ApplyPriceListInput([new PriceUpdate('fantasma', 100)]),
    );
    expect(unknown).toBeInstanceOf(ProductNotFoundInPriceList);
  });
});
