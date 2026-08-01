import { desc, eq, inArray, sql } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import {
  purchaseOrderLines,
  purchaseOrders,
  suppliers,
} from '#shared/infrastructure/database/schema.js';
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderSummary,
} from '#modules/purchases/domain/purchase-order.js';
import type { PurchaseOrderRepository } from '#modules/purchases/ports/purchase-order-repository.js';

type OrderRow = typeof purchaseOrders.$inferSelect;
type LineRow = typeof purchaseOrderLines.$inferSelect;

export class SqlitePurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(order: PurchaseOrder): Promise<void> {
    const orderRow: OrderRow = {
      id: order.id,
      number: order.number,
      supplierId: order.supplierId,
      status: order.status,
      notes: order.notes,
      createdBy: order.createdBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
    await this.db
      .insert(purchaseOrders)
      .values(orderRow)
      .onConflictDoUpdate({ target: purchaseOrders.id, set: orderRow });

    for (const line of order.lines) {
      const lineRow: LineRow = {
        id: line.id,
        orderId: order.id,
        productId: line.productId,
        description: line.description,
        saleType: line.saleType,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        unitCostCents: line.unitCostCents,
        packSize: line.packSize,
        packCostCents: line.packCostCents,
      };
      await this.db
        .insert(purchaseOrderLines)
        .values(lineRow)
        .onConflictDoUpdate({ target: purchaseOrderLines.id, set: lineRow });
    }
  }

  async nextNumber(): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COALESCE(MAX(${purchaseOrders.number}), 0) + 1` })
      .from(purchaseOrders);
    return rows[0]?.value ?? 1;
  }

  async findById(id: string): Promise<Nullable<PurchaseOrder>> {
    const row = await this.db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.id, id) });
    if (row === undefined) return null;
    const lineRows = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.orderId, id));
    return this.toEntity(row, lineRows);
  }

  async list(): Promise<PurchaseOrderSummary[]> {
    const rows = await this.db
      .select({ order: purchaseOrders, supplierName: suppliers.name })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.createdAt));
    if (rows.length === 0) return [];

    const lineRows = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(
        inArray(
          purchaseOrderLines.orderId,
          rows.map((row) => row.order.id),
        ),
      );
    const linesByOrder = new Map<string, PurchaseOrderLine[]>();
    for (const lineRow of lineRows) {
      const lines = linesByOrder.get(lineRow.orderId) ?? [];
      lines.push(this.toLine(lineRow));
      linesByOrder.set(lineRow.orderId, lines);
    }

    return rows.map((row) => {
      const lines = linesByOrder.get(row.order.id) ?? [];
      return new PurchaseOrderSummary(
        row.order.id,
        row.order.number,
        row.order.supplierId,
        row.supplierName,
        row.order.status,
        lines.length,
        lines.reduce((sum, line) => sum + line.totalCents(), 0),
        row.order.createdAt,
      );
    });
  }

  private toEntity(row: OrderRow, lineRows: LineRow[]): PurchaseOrder {
    return new PurchaseOrder(
      row.id,
      row.number,
      row.supplierId,
      row.status,
      row.notes,
      row.createdBy,
      row.createdAt,
      row.updatedAt,
      lineRows.map((lineRow) => this.toLine(lineRow)),
    );
  }

  private toLine(row: LineRow): PurchaseOrderLine {
    return new PurchaseOrderLine(
      row.id,
      row.productId,
      row.description,
      row.saleType,
      row.quantityOrdered,
      row.quantityReceived,
      row.unitCostCents,
      row.packSize,
      row.packCostCents,
    );
  }
}
