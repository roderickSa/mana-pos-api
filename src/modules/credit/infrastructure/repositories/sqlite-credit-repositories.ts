import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { creditEntries, customers } from '#shared/infrastructure/database/schema.js';
import { normalizeSearchText } from '#modules/catalog/domain/normalize-search-text.js';
import { Customer } from '#modules/credit/domain/customer.js';
import { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

type CustomerRow = typeof customers.$inferSelect;
type EntryRow = typeof creditEntries.$inferSelect;

export class SqliteCustomerRepository implements CustomerRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(customer: Customer): Promise<void> {
    const row = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      document: customer.document,
      creditLimitCents: customer.creditLimitCents,
      createdAt: customer.createdAt,
    };
    await this.db.insert(customers).values(row).onConflictDoUpdate({ target: customers.id, set: row });
  }

  async findById(id: string): Promise<Nullable<Customer>> {
    const row = await this.db.query.customers.findFirst({ where: eq(customers.id, id) });
    return row === undefined ? null : toCustomer(row);
  }

  async search(query: Nullable<string>): Promise<Customer[]> {
    if (query === null || normalizeSearchText(query) === '') {
      const rows = await this.db.select().from(customers).orderBy(customers.name);
      return rows.map(toCustomer);
    }
    const pattern = `%${normalizeSearchText(query)}%`;
    const rows = await this.db
      .select()
      .from(customers)
      .where(sql`LOWER(${customers.name}) LIKE ${pattern}`)
      .orderBy(customers.name);
    return rows.map(toCustomer);
  }
}

export class SqliteCreditLedger implements CreditLedger {
  constructor(private readonly db: DatabaseClient) {}

  async append(entry: CreditEntry): Promise<void> {
    await this.db.insert(creditEntries).values({
      id: entry.id,
      customerId: entry.customerId,
      type: entry.kind,
      amountCents: entry.amountCents,
      ticketId: entry.ticketId,
      paymentMethod: entry.paymentMethod,
      userId: entry.userId,
      createdAt: entry.createdAt,
    });
  }

  async entriesOf(customerId: string): Promise<CreditEntry[]> {
    const rows = await this.db
      .select()
      .from(creditEntries)
      .where(eq(creditEntries.customerId, customerId))
      .orderBy(desc(creditEntries.createdAt));
    return rows.map(toEntry);
  }

  async balanceOf(customerId: string): Promise<number> {
    const rows = await this.db
      .select({
        value: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntries.type} = 'charge' THEN ${creditEntries.amountCents} ELSE -${creditEntries.amountCents} END), 0)`,
      })
      .from(creditEntries)
      .where(eq(creditEntries.customerId, customerId));
    return rows[0]?.value ?? 0;
  }

  async balancesOf(customerIds: string[]): Promise<Map<string, number>> {
    if (customerIds.length === 0) {
      return new Map();
    }
    const rows = await this.db
      .select({
        customerId: creditEntries.customerId,
        value: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntries.type} = 'charge' THEN ${creditEntries.amountCents} ELSE -${creditEntries.amountCents} END), 0)`,
      })
      .from(creditEntries)
      .where(inArray(creditEntries.customerId, customerIds))
      .groupBy(creditEntries.customerId);
    return new Map(rows.map((row) => [row.customerId, row.value]));
  }

  async chargeForTicket(ticketId: string): Promise<Nullable<CreditEntry>> {
    const row = await this.db.query.creditEntries.findFirst({
      where: and(eq(creditEntries.ticketId, ticketId), eq(creditEntries.type, 'charge')),
    });
    return row === undefined ? null : toEntry(row);
  }

  async reversalExistsForTicket(ticketId: string): Promise<boolean> {
    const row = await this.db.query.creditEntries.findFirst({
      where: and(eq(creditEntries.ticketId, ticketId), eq(creditEntries.type, 'payment')),
    });
    return row !== undefined;
  }
}

function toCustomer(row: CustomerRow): Customer {
  return new Customer(row.id, row.name, row.phone, row.document, row.creditLimitCents, row.createdAt);
}

function toEntry(row: EntryRow): CreditEntry {
  return new CreditEntry(
    row.id,
    row.customerId,
    row.type,
    row.amountCents,
    row.ticketId,
    row.paymentMethod,
    row.userId,
    row.createdAt,
  );
}
