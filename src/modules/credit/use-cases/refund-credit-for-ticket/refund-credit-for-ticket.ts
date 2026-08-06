import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CreditEntry } from '#modules/credit/domain/credit-entry.js';
import type { CreditLedger } from '#modules/credit/ports/credit-ledger.js';

export class CreditRefunded {
  constructor(readonly entry: CreditEntry) {}
}

export class NoCreditToRefund {
  constructor(readonly ticketId: string) {}
}

export type RefundCreditResult = CreditRefunded | NoCreditToRefund;

export class RefundCreditForTicketInput {
  constructor(
    readonly ticketId: string,
    readonly amountCents: number,
    readonly userId: string,
  ) {}
}

// Devolución de una venta fiada: en vez de sacar efectivo, la deuda del
// cliente baja con un abono parcial ligado al ticket original.
export class RefundCreditForTicket {
  constructor(
    private readonly creditLedger: CreditLedger,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RefundCreditForTicketInput): Promise<RefundCreditResult> {
    const charge = await this.creditLedger.chargeForTicket(input.ticketId);
    if (charge === null) {
      return new NoCreditToRefund(input.ticketId);
    }

    const entry = new CreditEntry(
      this.idGenerator.generate(),
      charge.customerId,
      'payment',
      input.amountCents,
      input.ticketId,
      null,
      input.userId,
      this.timeManager.now(),
    );
    await this.creditLedger.append(entry);
    return new CreditRefunded(entry);
  }
}
