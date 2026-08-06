import { asc, eq, inArray } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { ticketRefundLines, ticketRefunds } from '#shared/infrastructure/database/schema.js';
import { Refund, RefundLine } from '#modules/sales/domain/refund.js';
import type { RefundRepository } from '#modules/sales/ports/refund-repository.js';

type RefundRow = typeof ticketRefunds.$inferSelect;
type RefundLineRow = typeof ticketRefundLines.$inferSelect;

export class SqliteRefundRepository implements RefundRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(refund: Refund): Promise<void> {
    this.db.transaction((tx) => {
      tx.insert(ticketRefunds)
        .values({
          id: refund.id,
          ticketId: refund.ticketId,
          reason: refund.reason,
          registeredBy: refund.registeredBy,
          refundedToCredit: refund.refundedToCredit,
          totalCents: refund.totalCents,
          createdAt: refund.createdAt,
        })
        .onConflictDoNothing({ target: ticketRefunds.id })
        .run();
      for (const line of refund.lines) {
        tx.insert(ticketRefundLines)
          .values({
            id: line.id,
            refundId: refund.id,
            ticketLineId: line.ticketLineId,
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            amountCents: line.amountCents,
          })
          .onConflictDoNothing({ target: ticketRefundLines.id })
          .run();
      }
    });
  }

  async findByTicketId(ticketId: string): Promise<Refund[]> {
    const rows = await this.db
      .select()
      .from(ticketRefunds)
      .where(eq(ticketRefunds.ticketId, ticketId))
      .orderBy(asc(ticketRefunds.createdAt));
    if (rows.length === 0) {
      return [];
    }
    const lineRows = await this.db
      .select()
      .from(ticketRefundLines)
      .where(inArray(ticketRefundLines.refundId, rows.map((row) => row.id)));
    return rows.map((row) => this.toEntity(row, lineRows.filter((line) => line.refundId === row.id)));
  }

  private toEntity(row: RefundRow, lineRows: RefundLineRow[]): Refund {
    return new Refund(
      row.id,
      row.ticketId,
      lineRows.map(
        (line) =>
          new RefundLine(
            line.id,
            line.ticketLineId,
            line.productId,
            line.description,
            line.quantity,
            line.amountCents,
          ),
      ),
      row.reason,
      row.registeredBy,
      row.refundedToCredit,
      row.totalCents,
      row.createdAt,
    );
  }
}
