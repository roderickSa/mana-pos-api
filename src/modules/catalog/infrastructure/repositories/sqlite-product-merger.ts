import { eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import {
  productBarcodes,
  products,
  productSuppliers,
} from '#shared/infrastructure/database/schema.js';
import type { ProductMerger } from '#modules/catalog/ports/product-merger.js';

// Fusión de un duplicado dentro del maestro. Orden de operaciones pensado
// para que un corte a la mitad deje la BD consistente (las referencias se
// repuntan antes de borrar el duplicado).
export class SqliteProductMerger implements ProductMerger {
  constructor(private readonly db: DatabaseClient) {}

  async merge(winnerId: string, loserId: string, at: Date): Promise<void> {
    const loser = await this.db.query.products.findFirst({ where: eq(products.id, loserId) });
    if (loser === undefined) return;

    // Stock sumado; costo y vencimiento del maestro se completan con los del
    // duplicado solo si el maestro no los tenía.
    await this.db
      .update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} + ${loser.stockQuantity}`,
        costCents: sql`CASE WHEN ${products.costCents} > 0 THEN ${products.costCents} ELSE ${loser.costCents} END`,
        expiryDate: sql`COALESCE(${products.expiryDate}, ${loser.expiryDate?.getTime() ?? null})`,
      })
      .where(eq(products.id, winnerId));

    // Historial completo al maestro: kardex, líneas de ticket y de órdenes.
    await this.db.run(
      sql`UPDATE stock_movements SET product_id = ${winnerId} WHERE product_id = ${loserId}`,
    );
    await this.db.run(
      sql`UPDATE ticket_lines SET product_id = ${winnerId} WHERE product_id = ${loserId}`,
    );
    await this.db.run(
      sql`UPDATE purchase_order_lines SET product_id = ${winnerId} WHERE product_id = ${loserId}`,
    );

    // Proveedores: unión sin duplicar pares.
    await this.db.run(
      sql`INSERT OR IGNORE INTO product_suppliers (product_id, supplier_id)
          SELECT ${winnerId}, supplier_id FROM product_suppliers WHERE product_id = ${loserId}`,
    );
    await this.db.delete(productSuppliers).where(eq(productSuppliers.productId, loserId));

    // Todos los códigos del duplicado quedan como alias del maestro:
    // escanear cualquiera de los dos sigue vendiendo.
    await this.db
      .update(productBarcodes)
      .set({ productId: winnerId })
      .where(eq(productBarcodes.productId, loserId));
    if (loser.barcode !== null) {
      await this.db.run(
        sql`INSERT OR IGNORE INTO product_barcodes (barcode, product_id, created_at)
            SELECT ${loser.barcode}, ${winnerId}, ${at.getTime()}
            WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = ${winnerId} AND barcode = ${loser.barcode})`,
      );
    }

    await this.db.delete(products).where(eq(products.id, loserId));
  }
}
