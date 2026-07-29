import { DiscountStockForSale } from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.js';
import {
  DiscountStockForSaleInput,
  SaleItem,
} from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.input.js';
import {
  SaleAlreadyDiscounted,
  StockDiscountedForSale,
} from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.output.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('DiscountStockForSale', () => {
  let repository: InventoryRepositoryForTesting;
  let useCase: DiscountStockForSale;

  beforeEach(() => {
    repository = new InventoryRepositoryForTesting();
    useCase = new DiscountStockForSale(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
  });

  it('discounts stock for every ticket line', async () => {
    repository.seedStock('gaseosa', 10);
    repository.seedStock('papaya', 5_000);

    const result = await useCase.execute(
      new DiscountStockForSaleInput(
        'ticket-1',
        [new SaleItem('gaseosa', 2, 700), new SaleItem('papaya', 645, 290)],
        'cajera-rosa',
      ),
    );

    expect(result).toBeInstanceOf(StockDiscountedForSale);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(8);
    expect((await repository.getStock('papaya'))?.quantity).toBe(4_355);
  });

  it('is idempotent per ticket: a replay does not discount twice', async () => {
    repository.seedStock('gaseosa', 10);
    const input = new DiscountStockForSaleInput(
      'ticket-1',
      [new SaleItem('gaseosa', 2, 700)],
      'cajera-rosa',
    );

    await useCase.execute(input);
    const replay = await useCase.execute(input);

    expect(replay).toBeInstanceOf(SaleAlreadyDiscounted);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(8);
    expect(repository.allMovements()).toHaveLength(1);
  });

  it('never blocks the sale: stock can go negative', async () => {
    repository.seedStock('gaseosa', 1);

    const result = await useCase.execute(
      new DiscountStockForSaleInput('ticket-2', [new SaleItem('gaseosa', 3, 1050)], 'cajera-rosa'),
    );

    expect(result).toBeInstanceOf(StockDiscountedForSale);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(-2);
  });

  it('rejects unknown products before touching stock', async () => {
    repository.seedStock('gaseosa', 10);

    const result = await useCase.execute(
      new DiscountStockForSaleInput(
        'ticket-3',
        [new SaleItem('gaseosa', 1, 350), new SaleItem('fantasma', 1, 100)],
        'cajera-rosa',
      ),
    );

    expect(result).toBeInstanceOf(ProductNotFoundInInventory);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(10);
    expect(repository.allMovements()).toHaveLength(0);
  });
});
