import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import type { ReturnRefundStockInput } from '#modules/inventory/use-cases/return-refund-stock/return-refund-stock.input.js';
import {
  RefundAlreadyReturned,
  RefundStockReturned,
  type ReturnRefundStockResult,
} from '#modules/inventory/use-cases/return-refund-stock/return-refund-stock.output.js';

// El cliente devolvió productos de una venta: reingresan al stock con kardex
// vinculado al ticket. Idempotente por refundId (el reason lo lleva grabado).
export class ReturnRefundStock {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ReturnRefundStockInput): Promise<ReturnRefundStockResult> {
    const reason = `devolución ${input.refundId}`;
    const existing = await this.inventoryRepository.findMovementsByTicketId(input.ticketId);
    if (existing.some((movement) => movement.kind === 'refund' && movement.reason === reason)) {
      return new RefundAlreadyReturned(input.refundId);
    }

    const now = this.timeManager.now();
    const movements = input.items.map(
      (item) =>
        new StockMovement(
          this.idGenerator.generate(),
          item.productId,
          'refund',
          item.quantity,
          item.valueCents,
          reason,
          input.ticketId,
          input.userId,
          now,
        ),
    );
    await this.inventoryRepository.applyMovements(movements);
    return new RefundStockReturned(movements);
  }
}
