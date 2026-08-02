import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { products, stockMovements } from '#shared/infrastructure/database/schema.js';
import { ProductStock } from '#modules/inventory/domain/product-stock.js';
import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import {
  StockMovementPage,
  StockMovementWithProduct,
} from '#modules/inventory/domain/stock-movement-page.js';
import type { MovementSearchParams } from '#modules/inventory/ports/movement-search-params.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';

type StockMovementRow = typeof stockMovements.$inferSelect;

export class SqliteInventoryRepository implements InventoryRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getStock(productId: string): Promise<Nullable<ProductStock>> {
    const row = await this.db.query.products.findFirst({
      columns: { id: true, stockQuantity: true, saleType: true, costCents: true },
      where: eq(products.id, productId),
    });
    return row === undefined
      ? null
      : new ProductStock(row.id, row.stockQuantity, row.saleType, row.costCents);
  }

  async applyMovements(movements: StockMovement[]): Promise<void> {
    if (movements.length === 0) {
      return;
    }
    this.db.transaction((tx) => {
      for (const movement of movements) {
        tx.insert(stockMovements).values(this.toRow(movement)).run();
        tx.update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} + ${movement.quantity}`,
            updatedAt: movement.createdAt,
          })
          .where(eq(products.id, movement.productId))
          .run();
      }
    });
  }

  async setProductCost(productId: string, costCents: number): Promise<void> {
    await this.db
      .update(products)
      .set({ costCents, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  async findMovementsByTicketId(ticketId: string): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.ticketId, ticketId));
    return rows.map((row) => this.toEntity(row));
  }

  async findMovementsByProductId(productId: string): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt));
    return rows.map((row) => this.toEntity(row));
  }

  async searchMovements(params: MovementSearchParams): Promise<StockMovementPage> {
    const conditions: SQL[] = [];
    if (params.productQuery !== null) {
      // Un query numérico largo es un código de barras: match exacto contra
      // el principal o cualquiera de los alias del producto.
      if (/^\d{6,}$/.test(params.productQuery)) {
        conditions.push(
          sql`(${products.barcode} = ${params.productQuery} OR EXISTS (
            SELECT 1 FROM product_barcodes pb
            WHERE pb.product_id = ${products.id} AND pb.barcode = ${params.productQuery}
          ))`,
        );
      } else {
        const pattern = `%${params.productQuery.toLowerCase()}%`;
        conditions.push(sql`${products.normalizedName} LIKE ${pattern}`);
      }
    }
    if (params.kind !== null) {
      conditions.push(eq(stockMovements.type, params.kind));
    }
    if (params.from !== null) {
      conditions.push(gte(stockMovements.createdAt, params.from));
    }
    if (params.to !== null) {
      conditions.push(lte(stockMovements.createdAt, params.to));
    }

    const rows = await this.db
      .select({ movement: stockMovements, productName: products.name })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    const totalRows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions));

    return new StockMovementPage(
      rows.map((row) => new StockMovementWithProduct(this.toEntity(row.movement), row.productName)),
      totalRows[0]?.value ?? 0,
    );
  }

  private toEntity(row: StockMovementRow): StockMovement {
    return new StockMovement(
      row.id,
      row.productId,
      row.type,
      row.quantity,
      row.valueCents,
      row.reason,
      row.ticketId,
      row.userId,
      row.createdAt,
    );
  }

  private toRow(movement: StockMovement): StockMovementRow {
    return {
      id: movement.id,
      productId: movement.productId,
      type: movement.kind,
      quantity: movement.quantity,
      valueCents: movement.valueCents,
      reason: movement.reason,
      ticketId: movement.ticketId,
      userId: movement.userId,
      createdAt: movement.createdAt,
    };
  }
}
