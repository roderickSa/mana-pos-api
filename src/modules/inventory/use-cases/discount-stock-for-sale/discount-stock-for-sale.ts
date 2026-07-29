import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { DiscountStockForSaleInput } from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.input.js';
import {
  SaleAlreadyDiscounted,
  StockDiscountedForSale,
  type DiscountStockForSaleResult,
} from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.output.js';

// La venta nunca se bloquea por stock: puede dejar el stock negativo (se corrige
// luego con conteo). Lo que sí garantiza es idempotencia por ticketId.
export class DiscountStockForSale {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: DiscountStockForSaleInput): Promise<DiscountStockForSaleResult> {
    const existingMovements = await this.inventoryRepository.findMovementsByTicketId(
      input.ticketId,
    );
    if (existingMovements.length > 0) {
      return new SaleAlreadyDiscounted(input.ticketId);
    }

    for (const item of input.items) {
      const stock = await this.inventoryRepository.getStock(item.productId);
      if (stock === null) {
        return new ProductNotFoundInInventory(item.productId);
      }
    }

    const now = this.timeManager.now();
    const movements = input.items.map(
      (item) =>
        new StockMovement(
          this.idGenerator.generate(),
          item.productId,
          'sale',
          -item.quantity,
          -item.valueCents,
          null,
          input.ticketId,
          input.userId,
          now,
        ),
    );
    await this.inventoryRepository.applyMovements(movements);
    return new StockDiscountedForSale(movements);
  }
}
