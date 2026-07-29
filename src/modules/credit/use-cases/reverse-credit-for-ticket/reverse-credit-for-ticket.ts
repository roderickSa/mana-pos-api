import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';

export class CreditReversed {
  constructor(readonly entry: CreditEntry) {}
}

export class NoCreditForTicket {
  constructor(readonly ticketId: string) {}
}

export class CreditAlreadyReversed {
  constructor(readonly ticketId: string) {}
}

export type ReverseCreditResult = CreditReversed | NoCreditForTicket | CreditAlreadyReversed;

export class ReverseCreditForTicketInput {
  constructor(
    readonly ticketId: string,
    readonly userId: string,
  ) {}
}

// Al anular una venta fiada, la deuda del cliente se revierte (idempotente).
export class ReverseCreditForTicket {
  constructor(
    private readonly creditLedger: CreditLedger,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ReverseCreditForTicketInput): Promise<ReverseCreditResult> {
    const charge = await this.creditLedger.chargeForTicket(input.ticketId);
    if (charge === null) {
      return new NoCreditForTicket(input.ticketId);
    }
    if (await this.creditLedger.reversalExistsForTicket(input.ticketId)) {
      return new CreditAlreadyReversed(input.ticketId);
    }

    const entry = new CreditEntry(
      this.idGenerator.generate(),
      charge.customerId,
      'payment',
      charge.amountCents,
      input.ticketId,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.creditLedger.append(entry);
    return new CreditReversed(entry);
  }
}
