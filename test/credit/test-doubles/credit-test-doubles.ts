import type { Nullable } from '#shared/domain/nullable.js';
import { Customer } from '#modules/credit/domain/customer.js';
import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

export class CustomerRepositoryForTesting implements CustomerRepository {
  private readonly customersById = new Map<string, Customer>();

  async save(customer: Customer): Promise<void> {
    this.customersById.set(customer.id, customer);
  }

  async findById(id: string): Promise<Nullable<Customer>> {
    return this.customersById.get(id) ?? null;
  }

  async search(query: Nullable<string>): Promise<Customer[]> {
    const all = [...this.customersById.values()];
    if (query === null) return all;
    const lowered = query.toLowerCase();
    return all.filter((customer) => customer.name.toLowerCase().includes(lowered));
  }
}

export class CreditLedgerForTesting implements CreditLedger {
  private readonly entries: CreditEntry[] = [];

  async append(entry: CreditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async entriesOf(customerId: string): Promise<CreditEntry[]> {
    return this.entries.filter((entry) => entry.customerId === customerId);
  }

  async balanceOf(customerId: string): Promise<number> {
    return (await this.entriesOf(customerId)).reduce(
      (sum, entry) => sum + (entry.kind === 'charge' ? entry.amountCents : -entry.amountCents),
      0,
    );
  }

  async balancesOf(customerIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const id of customerIds) {
      result.set(id, await this.balanceOf(id));
    }
    return result;
  }

  async chargeForTicket(ticketId: string): Promise<Nullable<CreditEntry>> {
    return this.entries.find((entry) => entry.ticketId === ticketId && entry.kind === 'charge') ?? null;
  }

  async reversalExistsForTicket(ticketId: string): Promise<boolean> {
    return this.entries.some((entry) => entry.ticketId === ticketId && entry.kind === 'payment');
  }

  all(): CreditEntry[] {
    return [...this.entries];
  }
}

export function customerMother(id = 'cliente-1', creditLimitCents = 5000): Customer {
  return new Customer(id, 'Doña Carmen', '999888777', null, creditLimitCents, new Date('2026-07-01'));
}
