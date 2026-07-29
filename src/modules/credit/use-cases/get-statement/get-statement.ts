import { CustomerAccount } from '#modules/credit/domain/customer.js';
import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

export class GetStatementInput {
  constructor(readonly customerId: string) {}
}

export class Statement {
  constructor(
    readonly account: CustomerAccount,
    readonly entries: CreditEntry[],
  ) {}
}

export class CustomerNotFoundForStatement {
  constructor(readonly customerId: string) {}
}

export type GetStatementResult = Statement | CustomerNotFoundForStatement;

export class GetStatement {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly creditLedger: CreditLedger,
  ) {}

  async execute(input: GetStatementInput): Promise<GetStatementResult> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (customer === null) {
      return new CustomerNotFoundForStatement(input.customerId);
    }
    const entries = await this.creditLedger.entriesOf(input.customerId);
    const balance = await this.creditLedger.balanceOf(input.customerId);
    return new Statement(new CustomerAccount(customer, balance), entries);
  }
}
