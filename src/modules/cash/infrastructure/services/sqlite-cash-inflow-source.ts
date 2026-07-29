import { and, eq, gte, sql } from 'drizzle-orm';

import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { creditEntries, payments, tickets } from '#shared/infrastructure/database/schema.js';
import { MethodTotal, type CashInflowSource } from '#modules/cash/ports/cash-inflow-source.js';

export class SqliteCashInflowSource implements CashInflowSource {
  constructor(private readonly db: DatabaseClient) {}

  async cashFromSalesSince(from: Date): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` })
      .from(payments)
      .innerJoin(tickets, eq(payments.ticketId, tickets.id))
      .where(
        and(eq(payments.method, 'cash'), eq(tickets.status, 'charged'), gte(tickets.chargedAt, from)),
      );
    return rows[0]?.value ?? 0;
  }

  async cashFromAbonosSince(from: Date): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COALESCE(SUM(${creditEntries.amountCents}), 0)` })
      .from(creditEntries)
      .where(
        and(
          eq(creditEntries.type, 'payment'),
          eq(creditEntries.paymentMethod, 'cash'),
          gte(creditEntries.createdAt, from),
        ),
      );
    return rows[0]?.value ?? 0;
  }

  async salesByMethodSince(from: Date): Promise<MethodTotal[]> {
    const rows = await this.db
      .select({
        method: payments.method,
        amount: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .innerJoin(tickets, eq(payments.ticketId, tickets.id))
      .where(and(eq(tickets.status, 'charged'), gte(tickets.chargedAt, from)))
      .groupBy(payments.method);
    return rows.map((row) => new MethodTotal(row.method, row.amount));
  }
}
