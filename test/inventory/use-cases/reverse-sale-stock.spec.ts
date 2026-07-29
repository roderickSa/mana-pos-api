import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { ReverseSaleStock } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.js';
import { ReverseSaleStockInput } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.input.js';
import {
  NoSaleMovementsForTicket,
  SaleAlreadyReversed,
  SaleStockReversed,
} from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.output.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('ReverseSaleStock', () => {
  let repository: InventoryRepositoryForTesting;
  let useCase: ReverseSaleStock;

  beforeEach(() => {
    repository = new InventoryRepositoryForTesting();
    useCase = new ReverseSaleStock(repository, new IdGeneratorForTesting(), new TimeManagerForTesting());
  });

  it('restores the stock of a sold ticket', async () => {
    repository.seedStock('gaseosa', 8);
    await repository.applyMovements([
      new StockMovement('m1', 'gaseosa', 'sale', -2, -700, null, 'ticket-1', 'cajera', new Date()),
    ]);

    const result = await useCase.execute(new ReverseSaleStockInput('ticket-1', 'encargado'));

    expect(result).toBeInstanceOf(SaleStockReversed);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(8);
  });

  it('does not reverse twice', async () => {
    repository.seedStock('gaseosa', 8);
    await repository.applyMovements([
      new StockMovement('m1', 'gaseosa', 'sale', -2, -700, null, 'ticket-1', 'cajera', new Date()),
    ]);

    await useCase.execute(new ReverseSaleStockInput('ticket-1', 'encargado'));
    const replay = await useCase.execute(new ReverseSaleStockInput('ticket-1', 'encargado'));

    expect(replay).toBeInstanceOf(SaleAlreadyReversed);
    expect((await repository.getStock('gaseosa'))?.quantity).toBe(8);
  });

  it('reports tickets without sale movements', async () => {
    const result = await useCase.execute(new ReverseSaleStockInput('ticket-x', 'encargado'));

    expect(result).toBeInstanceOf(NoSaleMovementsForTicket);
  });
});
