import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import type { RegisterStockEntryInput } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.input.js';
import {
  ProductNotFoundInInventory,
  StockEntryRegistered,
  type RegisterStockEntryResult,
} from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';

export class RegisterStockEntry {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RegisterStockEntryInput): Promise<RegisterStockEntryResult> {
    const stock = await this.inventoryRepository.getStock(input.productId);
    if (stock === null) {
      return new ProductNotFoundInInventory(input.productId);
    }

    const movement = new StockMovement(
      this.idGenerator.generate(),
      input.productId,
      'purchase',
      input.quantity,
      stock.costOf(input.quantity),
      null,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.inventoryRepository.applyMovements([movement]);
    return new StockEntryRegistered(movement);
  }
}
