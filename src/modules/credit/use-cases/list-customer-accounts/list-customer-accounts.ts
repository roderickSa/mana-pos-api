import type { Nullable } from '#shared/domain/nullable.js';
import { CustomerAccount } from '#modules/credit/domain/customer.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

export class ListCustomerAccountsInput {
  constructor(
    readonly query: Nullable<string>,
    readonly onlyDebtors: boolean,
  ) {}
}

export class ListCustomerAccounts {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly creditLedger: CreditLedger,
  ) {}

  async execute(input: ListCustomerAccountsInput): Promise<CustomerAccount[]> {
    const customers = await this.customerRepository.search(input.query);
    const balances = await this.creditLedger.balancesOf(customers.map((customer) => customer.id));
    const debtSince = await this.creditLedger.debtSinceOf(customers.map((customer) => customer.id));
    const accounts = customers.map(
      (customer) =>
        new CustomerAccount(customer, balances.get(customer.id) ?? 0, debtSince.get(customer.id) ?? null),
    );
    const filtered = input.onlyDebtors
      ? accounts.filter((account) => account.balanceCents > 0)
      : accounts;
    // Deudores primero, de mayor a menor deuda.
    return filtered.sort((a, b) => b.balanceCents - a.balanceCents);
  }
}
