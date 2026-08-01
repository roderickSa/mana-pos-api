import type { Nullable } from '#shared/domain/nullable.js';
import {
  StockMovementPage,
  StockMovementWithProduct,
} from '#modules/inventory/domain/stock-movement-page.js';
import type { MovementSearchParams } from '#modules/inventory/ports/movement-search-params.js';
import { ExpiringProduct } from '#modules/inventory/domain/expiring-product.js';
import { ProductStock } from '#modules/inventory/domain/product-stock.js';
import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';

interface SeededStock {
  quantity: number;
  saleType: 'unit' | 'weight';
  costCents: number;
  expiryDate?: Date | null;
  name?: string;
}

export class InventoryRepositoryForTesting implements InventoryRepository {
  private readonly stockByProductId = new Map<string, SeededStock>();
  private readonly movements: StockMovement[] = [];

  seedStock(
    productId: string,
    quantity: number,
    saleType: 'unit' | 'weight' = 'unit',
    costCents = 0,
  ): void {
    this.stockByProductId.set(productId, { quantity, saleType, costCents });
  }

  async getStock(productId: string): Promise<Nullable<ProductStock>> {
    const seeded = this.stockByProductId.get(productId);
    return seeded === undefined
      ? null
      : new ProductStock(productId, seeded.quantity, seeded.saleType, seeded.costCents);
  }

  async applyMovements(movements: StockMovement[]): Promise<void> {
    for (const movement of movements) {
      const current = this.stockByProductId.get(movement.productId) ?? {
        quantity: 0,
        saleType: 'unit' as const,
        costCents: 0,
      };
      this.stockByProductId.set(movement.productId, {
        ...current,
        quantity: current.quantity + movement.quantity,
      });
      this.movements.push(movement);
    }
  }

  async setProductCost(productId: string, costCents: number): Promise<void> {
    const current = this.stockByProductId.get(productId);
    if (current !== undefined) {
      this.stockByProductId.set(productId, { ...current, costCents });
    }
  }

  async setProductExpiry(productId: string, expiryDate: Nullable<Date>): Promise<void> {
    const current = this.stockByProductId.get(productId);
    if (current !== undefined) {
      this.stockByProductId.set(productId, { ...current, expiryDate });
    }
  }

  expiryOf(productId: string): Nullable<Date> {
    return this.stockByProductId.get(productId)?.expiryDate ?? null;
  }

  async listExpiring(before: Date): Promise<ExpiringProduct[]> {
    const items: ExpiringProduct[] = [];
    for (const [productId, stock] of this.stockByProductId) {
      const expiry = stock.expiryDate;
      if (expiry == null || expiry > before) continue;
      items.push(
        new ExpiringProduct(productId, stock.name ?? productId, stock.saleType, stock.quantity, expiry),
      );
    }
    return items;
  }

  async findMovementsByTicketId(ticketId: string): Promise<StockMovement[]> {
    return this.movements.filter((movement) => movement.ticketId === ticketId);
  }

  async findMovementsByProductId(productId: string): Promise<StockMovement[]> {
    return this.movements.filter((movement) => movement.productId === productId);
  }

  async searchMovements(params: MovementSearchParams): Promise<StockMovementPage> {
    const filtered = this.movements.filter((movement) => {
      if (params.kind !== null && movement.kind !== params.kind) return false;
      if (params.from !== null && movement.createdAt < params.from) return false;
      if (params.to !== null && movement.createdAt > params.to) return false;
      return true;
    });
    return new StockMovementPage(
      filtered
        .slice(params.offset, params.offset + params.limit)
        .map((movement) => new StockMovementWithProduct(movement, movement.productId)),
      filtered.length,
    );
  }

  allMovements(): StockMovement[] {
    return [...this.movements];
  }
}
