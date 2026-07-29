import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';
import type { ChargeCreditInput } from '#modules/credit/use-cases/charge-credit/charge-credit.input.js';
import {
  CreditAlreadyCharged,
  CreditCharged,
  CreditLimitExceeded,
  CustomerNotFoundForCredit,
  type ChargeCreditResult,
} from '#modules/credit/use-cases/charge-credit/charge-credit.output.js';

export class ChargeCredit {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly creditLedger: CreditLedger,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ChargeCreditInput): Promise<ChargeCreditResult> {
    const existing = await this.creditLedger.chargeForTicket(input.ticketId);
    if (existing !== null) {
      return new CreditAlreadyCharged(existing);
    }

    const customer = await this.customerRepository.findById(input.customerId);
    if (customer === null) {
      return new CustomerNotFoundForCredit(input.customerId);
    }

    const balance = await this.creditLedger.balanceOf(input.customerId);
    if (balance + input.amountCents > customer.creditLimitCents) {
      return new CreditLimitExceeded(
        customer.creditLimitCents,
        balance,
        Math.max(0, customer.creditLimitCents - balance),
      );
    }

    const entry = new CreditEntry(
      this.idGenerator.generate(),
      input.customerId,
      'charge',
      input.amountCents,
      input.ticketId,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.creditLedger.append(entry);
    return new CreditCharged(entry);
  }
}
