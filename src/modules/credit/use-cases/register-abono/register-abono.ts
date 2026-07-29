import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';
import type { RegisterAbonoInput } from '#modules/credit/use-cases/register-abono/register-abono.input.js';
import {
  AbonoExceedsDebt,
  AbonoRegistered,
  CustomerNotFoundForAbono,
  type RegisterAbonoResult,
} from '#modules/credit/use-cases/register-abono/register-abono.output.js';

export class RegisterAbono {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly creditLedger: CreditLedger,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RegisterAbonoInput): Promise<RegisterAbonoResult> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (customer === null) {
      return new CustomerNotFoundForAbono(input.customerId);
    }

    const balance = await this.creditLedger.balanceOf(input.customerId);
    if (input.amountCents > balance) {
      return new AbonoExceedsDebt(balance);
    }

    const entry = new CreditEntry(
      this.idGenerator.generate(),
      input.customerId,
      'payment',
      input.amountCents,
      null,
      input.paymentMethod,
      input.userId,
      this.timeManager.now(),
    );
    await this.creditLedger.append(entry);
    return new AbonoRegistered(entry, balance - input.amountCents);
  }
}
