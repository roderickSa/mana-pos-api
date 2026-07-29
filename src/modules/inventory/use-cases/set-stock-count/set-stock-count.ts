import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { SetStockCountInput } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.input.js';
import {
  StockCountRegistered,
  type SetStockCountResult,
} from '#modules/inventory/use-cases/set-stock-count/set-stock-count.output.js';

export class SetStockCount {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: SetStockCountInput): Promise<SetStockCountResult> {
    const stock = await this.inventoryRepository.getStock(input.productId);
    if (stock === null) {
      return new ProductNotFoundInInventory(input.productId);
    }

    const difference = input.countedQuantity - stock.quantity;
    if (difference === 0) {
      return new StockCountRegistered(input.productId, 0, null);
    }

    const movement = new StockMovement(
      this.idGenerator.generate(),
      input.productId,
      'count',
      difference,
      stock.costOf(difference),
      null,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.inventoryRepository.applyMovements([movement]);
    return new StockCountRegistered(input.productId, difference, movement);
  }
}
