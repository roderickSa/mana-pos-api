import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import type { ReverseSaleStockInput } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.input.js';
import {
  NoSaleMovementsForTicket,
  SaleAlreadyReversed,
  SaleStockReversed,
  type ReverseSaleStockResult,
} from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.output.js';

export class ReverseSaleStock {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ReverseSaleStockInput): Promise<ReverseSaleStockResult> {
    const movements = await this.inventoryRepository.findMovementsByTicketId(input.ticketId);
    const saleMovements = movements.filter((movement) => movement.kind === 'sale');
    if (saleMovements.length === 0) {
      return new NoSaleMovementsForTicket(input.ticketId);
    }
    if (movements.some((movement) => movement.kind === 'sale_reversal')) {
      return new SaleAlreadyReversed(input.ticketId);
    }

    const now = this.timeManager.now();
    const reversals = saleMovements.map(
      (movement) =>
        new StockMovement(
          this.idGenerator.generate(),
          movement.productId,
          'sale_reversal',
          -movement.quantity,
          movement.valueCents === null ? null : -movement.valueCents,
          null,
          input.ticketId,
          input.userId,
          now,
        ),
    );
    await this.inventoryRepository.applyMovements(reversals);
    return new SaleStockReversed(reversals);
  }
}
