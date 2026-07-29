import { RegisterStockEntry } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.js';
import { RegisterStockEntryInput } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.input.js';
import {
  ProductNotFoundInInventory,
  StockEntryRegistered,
} from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import { SetStockCount } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.js';
import { SetStockCountInput } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.input.js';
import { StockCountRegistered } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.output.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('RegisterStockEntry', () => {
  it('adds purchased stock', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('arroz', 4);
    const useCase = new RegisterStockEntry(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(new RegisterStockEntryInput('arroz', 24, 'encargado'));

    expect(result).toBeInstanceOf(StockEntryRegistered);
    expect((await repository.getStock('arroz'))?.quantity).toBe(28);
  });

  it('returns ProductNotFoundInInventory for unknown products', async () => {
    const useCase = new RegisterStockEntry(
      new InventoryRepositoryForTesting(),
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(new RegisterStockEntryInput('fantasma', 1, 'encargado'));

    expect(result).toBeInstanceOf(ProductNotFoundInInventory);
  });
});

describe('SetStockCount', () => {
  it('registers the difference between counted and system stock', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('arroz', 28);
    const useCase = new SetStockCount(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(new SetStockCountInput('arroz', 25, 'encargado'));

    expect(result).toBeInstanceOf(StockCountRegistered);
    if (!(result instanceof StockCountRegistered)) return;
    expect(result.difference).toBe(-3);
    expect(result.movement?.kind).toBe('count');
    expect((await repository.getStock('arroz'))?.quantity).toBe(25);
  });

  it('registers no movement when the count matches', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('arroz', 28);
    const useCase = new SetStockCount(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(new SetStockCountInput('arroz', 28, 'encargado'));

    expect(result).toBeInstanceOf(StockCountRegistered);
    if (!(result instanceof StockCountRegistered)) return;
    expect(result.difference).toBe(0);
    expect(result.movement).toBeNull();
    expect(repository.allMovements()).toHaveLength(0);
  });
});
