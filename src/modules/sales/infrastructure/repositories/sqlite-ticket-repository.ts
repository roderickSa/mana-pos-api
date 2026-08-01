import { and, desc, eq, exists, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { payments, ticketLines, tickets } from '#shared/infrastructure/database/schema.js';
import {
  CardPayment,
  CashPayment,
  CreditPayment,
  YapePayment,
  type Payment,
} from '#modules/sales/domain/payment.js';
import { Ticket } from '#modules/sales/domain/ticket.js';
import {
  UnitTicketLine,
  WeightTicketLine,
  type TicketLine,
} from '#modules/sales/domain/ticket-line.js';
import {
  ChargedTicketStatus,
  OpenTicketStatus,
  VoidedTicketStatus,
  type TicketStatus,
} from '#modules/sales/domain/ticket-status.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import {
  PaymentMethodTotal,
  SalesSummary,
  SoldByUser,
  TicketListItem,
  TicketsPage,
  VoidedByUser,
  type PaymentMethodName,
} from '#modules/sales/domain/sales-report.js';
import type { TicketSearchParams } from '#modules/sales/ports/ticket-search-params.js';

type TicketRow = typeof tickets.$inferSelect;
type LineRow = typeof ticketLines.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

export class SqliteTicketRepository implements TicketRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(ticket: Ticket): Promise<void> {
    const ticketRow = {
      id: ticket.id,
      number: ticket.number,
      status: ticket.status.name,
      cashSessionId: ticket.cashSessionId,
      userId: ticket.userId,
      totalCents: ticket.totalCents,
      createdAt: ticket.createdAt,
      chargedAt: ticket.chargedAt,
      voidedAt: ticket.voidedAt,
      voidedBy: ticket.voidedBy,
      voidReason: ticket.voidReason,
    };

    this.db.transaction((tx) => {
      tx.insert(tickets).values(ticketRow).onConflictDoUpdate({ target: tickets.id, set: ticketRow }).run();
      for (const line of ticket.lines) {
        tx.insert(ticketLines)
          .values(this.toLineRow(ticket.id, line))
          .onConflictDoNothing({ target: ticketLines.id })
          .run();
      }
      for (const [index, payment] of ticket.payments.entries()) {
        tx.insert(payments)
          .values(this.toPaymentRow(ticket, payment, index))
          .onConflictDoNothing({ target: payments.id })
          .run();
      }
    });
  }

  async findById(id: string): Promise<Nullable<Ticket>> {
    const row = await this.db.query.tickets.findFirst({ where: eq(tickets.id, id) });
    if (row === undefined) {
      return null;
    }
    const lineRows = await this.db.select().from(ticketLines).where(eq(ticketLines.ticketId, id));
    const paymentRows = await this.db.select().from(payments).where(eq(payments.ticketId, id));
    return this.toEntity(row, lineRows, paymentRows);
  }

  async nextTicketNumber(): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COALESCE(MAX(${tickets.number}), 0) + 1` })
      .from(tickets);
    return rows[0]?.value ?? 1;
  }

  async searchTickets(params: TicketSearchParams): Promise<TicketsPage> {
    const conditions: SQL[] = [sql`${tickets.status} != 'open'`];
    if (params.status !== null) {
      conditions.push(eq(tickets.status, params.status));
    }
    if (params.from !== null) {
      conditions.push(gte(tickets.chargedAt, params.from));
    }
    if (params.to !== null) {
      conditions.push(lte(tickets.chargedAt, params.to));
    }
    if (params.method !== null) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(payments)
            .where(and(eq(payments.ticketId, tickets.id), eq(payments.method, params.method))),
        ),
      );
    }
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(tickets)
      .where(where)
      .orderBy(desc(tickets.chargedAt))
      .limit(params.limit)
      .offset(params.offset);

    const methodsByTicket = new Map<string, PaymentMethodName[]>();
    if (rows.length > 0) {
      const paymentRows = await this.db
        .select()
        .from(payments)
        .where(inArray(payments.ticketId, rows.map((row) => row.id)));
      for (const payment of paymentRows) {
        const list = methodsByTicket.get(payment.ticketId) ?? [];
        list.push(payment.method);
        methodsByTicket.set(payment.ticketId, list);
      }
    }

    const totalRows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(where);

    const chargedWhere = and(where, eq(tickets.status, 'charged'));
    const chargedRows = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${tickets.totalCents}), 0)`,
      })
      .from(tickets)
      .where(chargedWhere);

    const byMethodRows = await this.db
      .select({
        method: payments.method,
        amount: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .innerJoin(tickets, eq(payments.ticketId, tickets.id))
      .where(chargedWhere)
      .groupBy(payments.method);

    // Agrupado sin distinguir mayúsculas: "Encargado" y "encargado" son la
    // misma persona (el nombre viene de registros de distintas épocas).
    const voidedWhere = and(where, eq(tickets.status, 'voided'));
    const voidedByUserRows = await this.db
      .select({
        user: sql<string>`COALESCE(MAX(${tickets.voidedBy}), '-')`,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${tickets.totalCents}), 0)`,
      })
      .from(tickets)
      .where(voidedWhere)
      .groupBy(sql`LOWER(COALESCE(${tickets.voidedBy}, '-'))`);

    const soldByUserRows = await this.db
      .select({
        user: sql<string>`COALESCE(MAX(${tickets.userId}), '-')`,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${tickets.totalCents}), 0)`,
      })
      .from(tickets)
      .where(chargedWhere)
      .groupBy(sql`LOWER(${tickets.userId})`);

    return new TicketsPage(
      rows.map(
        (row) =>
          new TicketListItem(
            row.id,
            row.number,
            row.status === 'voided' ? 'voided' : 'charged',
            row.totalCents,
            row.chargedAt,
            methodsByTicket.get(row.id) ?? [],
            row.userId,
          ),
      ),
      totalRows[0]?.value ?? 0,
      new SalesSummary(
        chargedRows[0]?.count ?? 0,
        chargedRows[0]?.total ?? 0,
        byMethodRows.map((row) => new PaymentMethodTotal(row.method, row.amount)),
        voidedByUserRows.map((row) => new VoidedByUser(row.user, row.count, row.total)),
        soldByUserRows.map((row) => new SoldByUser(row.user, row.count, row.total)),
      ),
    );
  }

  private toEntity(row: TicketRow, lineRows: LineRow[], paymentRows: PaymentRow[]): Ticket {
    return new Ticket(
      row.id,
      row.number,
      toStatus(row.status),
      lineRows.map((line) => this.toLine(line)),
      paymentRows.map((payment) => this.toPayment(payment)),
      row.userId,
      row.cashSessionId,
      row.createdAt,
      row.chargedAt,
      row.voidedAt,
      row.voidedBy,
      row.voidReason,
    );
  }

  private toLine(row: LineRow): TicketLine {
    if (row.saleType === 'unit') {
      return new UnitTicketLine(row.id, row.productId, row.description, row.quantity, row.unitPriceCents);
    }
    return new WeightTicketLine(
      row.id,
      row.productId,
      row.description,
      row.quantity,
      row.unitPriceCents,
      row.weightSource ?? 'manual',
    );
  }

  private toPayment(row: PaymentRow): Payment {
    if (row.method === 'cash') return new CashPayment(row.amountCents);
    if (row.method === 'yape') return new YapePayment(row.amountCents);
    if (row.method === 'credit') return new CreditPayment(row.amountCents, row.customerId ?? '');
    return new CardPayment(row.amountCents);
  }

  private toLineRow(ticketId: string, line: TicketLine): LineRow {
    const isUnit = line instanceof UnitTicketLine;
    return {
      id: line.id,
      ticketId,
      productId: line.productId,
      description: line.description,
      saleType: isUnit ? 'unit' : 'weight',
      quantity: isUnit ? line.quantity : line.grams,
      weightSource: isUnit ? null : line.weightSource,
      unitPriceCents: isUnit ? line.unitPriceCents : line.pricePerKgCents,
      discountCents: 0,
      totalCents: line.totalCents,
    };
  }

  private toPaymentRow(ticket: Ticket, payment: Payment, index: number): PaymentRow {
    const method =
      payment instanceof CashPayment
        ? ('cash' as const)
        : payment instanceof YapePayment
          ? ('yape' as const)
          : payment instanceof CreditPayment
            ? ('credit' as const)
            : ('card' as const);
    return {
      id: `${ticket.id}-payment-${index}`,
      ticketId: ticket.id,
      method,
      amountCents: payment.amountCents,
      customerId: payment instanceof CreditPayment ? payment.customerId : null,
      createdAt: ticket.chargedAt ?? ticket.createdAt,
    };
  }
}

function toStatus(name: TicketRow['status']): TicketStatus {
  if (name === 'open') return new OpenTicketStatus();
  if (name === 'charged') return new ChargedTicketStatus();
  return new VoidedTicketStatus();
}
