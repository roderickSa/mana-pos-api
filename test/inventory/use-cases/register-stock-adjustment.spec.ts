import { RegisterStockAdjustment } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.js';
import { RegisterStockAdjustmentInput } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.input.js';
import {
  AdjustmentExceedsStock,
  StockAdjusted,
} from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.output.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('RegisterStockAdjustment', () => {
  let repository: InventoryRepositoryForTesting;
  let useCase: RegisterStockAdjustment;

  beforeEach(() => {
    repository = new InventoryRepositoryForTesting();
    useCase = new RegisterStockAdjustment(
      repository,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
  });

  it('registers waste reducing stock', async () => {
    repository.seedStock('papaya', 5_000);

    const result = await useCase.execute(
      new RegisterStockAdjustmentInput('papaya', 'waste', 1_200, 'muy madura', 'encargado'),
    );

    expect(result).toBeInstanceOf(StockAdjusted);
    if (!(result instanceof StockAdjusted)) return;
    expect(result.movement.quantity).toBe(-1_200);
    expect(result.movement.kind).toBe('waste');
    expect((await repository.getStock('papaya'))?.quantity).toBe(3_800);
  });

  it('rejects adjustments larger than available stock', async () => {
    repository.seedStock('papaya', 500);

    const result = await useCase.execute(
      new RegisterStockAdjustmentInput('papaya', 'theft', 800, null, 'encargado'),
    );

    expect(result).toBeInstanceOf(AdjustmentExceedsStock);
    expect((await repository.getStock('papaya'))?.quantity).toBe(500);
  });

  it('returns ProductNotFoundInInventory for unknown products', async () => {
    const result = await useCase.execute(
      new RegisterStockAdjustmentInput('fantasma', 'expiry', 1, null, 'encargado'),
    );

    expect(result).toBeInstanceOf(ProductNotFoundInInventory);
  });
});
