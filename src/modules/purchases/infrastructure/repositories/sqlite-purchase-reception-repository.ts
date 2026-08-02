import { eq, inArray } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import {
  purchaseReceptionLines,
  purchaseReceptions,
} from '#shared/infrastructure/database/schema.js';
import {
  PurchaseReception,
  PurchaseReceptionLine,
} from '#modules/purchases/domain/purchase-reception.js';
import type { PurchaseReceptionRepository } from '#modules/purchases/ports/purchase-reception-repository.js';

export class SqlitePurchaseReceptionRepository implements PurchaseReceptionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(reception: PurchaseReception): Promise<void> {
    await this.db.insert(purchaseReceptions).values({
      id: reception.id,
      orderId: reception.orderId,
      receivedAt: reception.receivedAt,
      receivedBy: reception.receivedBy,
    });
    for (const [position, line] of reception.lines.entries()) {
      await this.db.insert(purchaseReceptionLines).values({
        id: `${reception.id}-${position}`,
        receptionId: reception.id,
        productId: line.productId,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents,
        expiryDate: line.expiryDate,
      });
    }
  }

  async listByOrder(orderId: string): Promise<PurchaseReception[]> {
    const headers = await this.db.query.purchaseReceptions.findMany({
      where: eq(purchaseReceptions.orderId, orderId),
      orderBy: (table, { asc }) => [asc(table.receivedAt)],
    });
    if (headers.length === 0) return [];
    const lines = await this.db.query.purchaseReceptionLines.findMany({
      where: inArray(
        purchaseReceptionLines.receptionId,
        headers.map((header) => header.id),
      ),
    });
    return headers.map(
      (header) =>
        new PurchaseReception(
          header.id,
          header.orderId,
          header.receivedAt,
          header.receivedBy,
          lines
            .filter((line) => line.receptionId === header.id)
            .map(
              (line) =>
                new PurchaseReceptionLine(
                  line.productId,
                  line.quantity,
                  line.unitCostCents,
                  line.expiryDate,
                ),
            ),
        ),
    );
  }
}
