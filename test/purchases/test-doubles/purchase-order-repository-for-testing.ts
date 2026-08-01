import type { Nullable } from '#shared/domain/nullable.js';
import {
  PurchaseOrder,
  PurchaseOrderSummary,
} from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';

export class PurchaseOrderRepositoryForTesting implements PurchaseOrderRepository {
  private readonly orders = new Map<string, PurchaseOrder>();

  async save(order: PurchaseOrder): Promise<void> {
    this.orders.set(order.id, order);
  }

  async nextNumber(): Promise<number> {
    return this.orders.size + 1;
  }

  async findById(id: string): Promise<Nullable<PurchaseOrder>> {
    return this.orders.get(id) ?? null;
  }

  async list(): Promise<PurchaseOrderSummary[]> {
    return [...this.orders.values()].map(
      (order) =>
        new PurchaseOrderSummary(
          order.id,
          order.number,
          order.supplierId,
          `proveedor-${order.supplierId}`,
          order.status,
          order.lines.length,
          order.totalCents(),
          order.createdAt,
        ),
    );
  }

  all(): PurchaseOrder[] {
    return [...this.orders.values()];
  }
}
