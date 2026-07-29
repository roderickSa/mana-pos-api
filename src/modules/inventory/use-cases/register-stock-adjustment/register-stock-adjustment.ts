import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { RegisterStockAdjustmentInput } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.input.js';
import {
  AdjustmentExceedsStock,
  StockAdjusted,
  type RegisterStockAdjustmentResult,
} from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.output.js';

export class RegisterStockAdjustment {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RegisterStockAdjustmentInput): Promise<RegisterStockAdjustmentResult> {
    const stock = await this.inventoryRepository.getStock(input.productId);
    if (stock === null) {
      return new ProductNotFoundInInventory(input.productId);
    }
    if (input.quantity > stock.quantity) {
      return new AdjustmentExceedsStock(input.productId, stock.quantity, input.quantity);
    }

    const movement = new StockMovement(
      this.idGenerator.generate(),
      input.productId,
      input.kind,
      -input.quantity,
      -stock.costOf(input.quantity),
      input.reason,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.inventoryRepository.applyMovements([movement]);
    return new StockAdjusted(movement);
  }
}
