import type { Nullable } from '#shared/domain/nullable.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';

export class CheckoutCompleted {
  constructor(
    readonly ticket: Ticket,
    readonly changeCents: number,
    // Aviso en humano si el voucher no salió (la venta queda cobrada igual).
    readonly printerWarning: Nullable<string>,
  ) {}
}

// Replay de un retry: la venta ya estaba cobrada, no se cobra dos veces.
export class TicketAlreadyCharged {
  constructor(readonly ticket: Ticket) {}
}

export class EmptyTicket {}

export class ProductNotSellable {
  constructor(readonly productId: string) {}
}

export class PaymentsDoNotMatchTotal {
  constructor(
    readonly totalCents: number,
    readonly paidCents: number,
  ) {}
}

export class CashReceivedInsufficient {
  constructor(
    readonly requiredCents: number,
    readonly receivedCents: number,
  ) {}
}

export class NoCashSessionOpen {}

export class CreditDeclinedAtCheckout {
  constructor(readonly humanMessage: string) {}
}

export type CheckoutResult =
  | CheckoutCompleted
  | TicketAlreadyCharged
  | EmptyTicket
  | ProductNotSellable
  | PaymentsDoNotMatchTotal
  | CashReceivedInsufficient
  | CreditDeclinedAtCheckout
  | NoCashSessionOpen;
