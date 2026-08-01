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

    // Con costo capturado, la entrada vale ese costo y el producto adopta el
    // costo de última compra; sin costo, se valoriza al costo vigente (0 = sin dato).
    const valueCents =
      input.unitCostCents === null
        ? stock.costOf(input.quantity)
        : Math.round(
            stock.saleType === 'unit'
              ? input.unitCostCents * input.quantity
              : (input.unitCostCents * input.quantity) / 1000,
          );

    const movement = new StockMovement(
      this.idGenerator.generate(),
      input.productId,
      'purchase',
      input.quantity,
      valueCents,
      null,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.inventoryRepository.applyMovements([movement]);
    if (input.unitCostCents !== null) {
      await this.inventoryRepository.setProductCost(input.productId, input.unitCostCents);
    }
    if (input.expiryDate !== null) {
      await this.inventoryRepository.setProductExpiry(input.productId, input.expiryDate);
    }
    return new StockEntryRegistered(movement);
  }
}
