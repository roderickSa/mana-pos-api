import { ChargeCredit } from '#modules/credit/use-cases/charge-credit/charge-credit.js';
import { ChargeCreditInput } from '#modules/credit/use-cases/charge-credit/charge-credit.input.js';
import {
  CreditAlreadyCharged,
  CreditCharged,
  CreditLimitExceeded,
  CustomerNotFoundForCredit,
} from '#modules/credit/use-cases/charge-credit/charge-credit.output.js';
import {
  ReverseCreditForTicket,
  ReverseCreditForTicketInput,
} from '#modules/credit/use-cases/reverse-credit-for-ticket/reverse-credit-for-ticket.js';
import {
  CreditRefunded,
  RefundCreditForTicket,
  RefundCreditForTicketInput,
} from '#modules/credit/use-cases/refund-credit-for-ticket/refund-credit-for-ticket.js';
import { exhaustive } from '#shared/domain/exhaustive.js';
import {
  CreditAccepted,
  CreditDeclined,
  type CreditChargeResult,
  type CreditGateway,
} from '#modules/sales/ports/credit-gateway.js';

function soles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

// Adapter: delega en los use cases del módulo credit y traduce a mensajes humanos.
export class CreditModuleGateway implements CreditGateway {
  constructor(
    private readonly chargeCreditUseCase: ChargeCredit,
    private readonly reverseCreditUseCase: ReverseCreditForTicket,
    private readonly refundCreditUseCase: RefundCreditForTicket,
  ) {}

  async chargeCredit(
    customerId: string,
    amountCents: number,
    ticketId: string,
    userId: string,
  ): Promise<CreditChargeResult> {
    const result = await this.chargeCreditUseCase.execute(
      new ChargeCreditInput(customerId, amountCents, ticketId, userId),
    );
    if (result instanceof CreditCharged || result instanceof CreditAlreadyCharged) {
      return new CreditAccepted();
    }
    if (result instanceof CreditLimitExceeded) {
      return new CreditDeclined(
        `El cliente no tiene crédito suficiente: le quedan ${soles(result.availableCents)} disponibles.`,
      );
    }
    if (result instanceof CustomerNotFoundForCredit) {
      return new CreditDeclined('El cliente ya no existe. Elige otro cliente para el fiado.');
    }
    exhaustive(result);
  }

  async reverseCreditForTicket(ticketId: string, userId: string): Promise<void> {
    await this.reverseCreditUseCase.execute(new ReverseCreditForTicketInput(ticketId, userId));
  }

  async refundToCredit(ticketId: string, amountCents: number, userId: string): Promise<boolean> {
    const result = await this.refundCreditUseCase.execute(
      new RefundCreditForTicketInput(ticketId, amountCents, userId),
    );
    return result instanceof CreditRefunded;
  }
}
