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

    const result = await useCase.execute(
      new RegisterStockEntryInput('arroz', 24, 'encargado', null, null),
    );

    expect(result).toBeInstanceOf(StockEntryRegistered);
    expect((await repository.getStock('arroz'))?.quantity).toBe(28);
  });

  it('captures the real purchase cost and updates the product cost', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('arroz', 4, 'unit', 100);
    const useCase = new RegisterStockEntry(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(
      new RegisterStockEntryInput('arroz', 10, 'encargado', 250, null),
    );

    expect(result).toBeInstanceOf(StockEntryRegistered);
    if (!(result instanceof StockEntryRegistered)) return;
    expect(result.movement.valueCents).toBe(2500);
    expect((await repository.getStock('arroz'))?.costCents).toBe(250);
  });

  it('captures the batch expiry date on the product', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('leche', 4);
    const useCase = new RegisterStockEntry(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
    const expiry = new Date('2026-08-15T12:00:00');

    await useCase.execute(new RegisterStockEntryInput('leche', 6, 'encargado', null, expiry));

    expect(repository.expiryOf('leche')).toEqual(expiry);
  });

  it('returns ProductNotFoundInInventory for unknown products', async () => {
    const useCase = new RegisterStockEntry(
      new InventoryRepositoryForTesting(),
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );

    const result = await useCase.execute(
      new RegisterStockEntryInput('fantasma', 1, 'encargado', null, null),
    );

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
