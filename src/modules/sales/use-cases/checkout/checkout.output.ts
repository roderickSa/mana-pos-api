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

// El descuento de una línea no puede superar el bruto de esa línea.
export class LineDiscountTooBig {
  constructor(
    readonly productId: string,
    readonly discountCents: number,
    readonly maxCents: number,
  ) {}
}

// El descuento del ticket no puede superar la suma de las líneas ya rebajadas.
export class TicketDiscountTooBig {
  constructor(
    readonly discountCents: number,
    readonly maxCents: number,
  ) {}
}

// Descuento fuera del margen de la cajera y sin autorización del encargado.
export class DiscountNeedsManager {}

export type CheckoutResult =
  | CheckoutCompleted
  | TicketAlreadyCharged
  | EmptyTicket
  | ProductNotSellable
  | PaymentsDoNotMatchTotal
  | CashReceivedInsufficient
  | CreditDeclinedAtCheckout
  | LineDiscountTooBig
  | TicketDiscountTooBig
  | DiscountNeedsManager
  | NoCashSessionOpen;
