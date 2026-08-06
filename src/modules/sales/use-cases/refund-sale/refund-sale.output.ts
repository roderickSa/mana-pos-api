import type { Nullable } from '#shared/domain/nullable.js';
import type { Refund } from '#modules/sales/domain/refund.js';

export class SaleRefunded {
  constructor(
    readonly refund: Refund,
    // Aviso en humano si la constancia no salió (la devolución queda igual).
    readonly printerWarning: Nullable<string>,
  ) {}
}

export class TicketNotFoundForRefund {
  constructor(readonly ticketId: string) {}
}

// Solo se devuelve sobre ventas cobradas (una anulada ya revirtió todo).
export class RefundNotAllowed {
  constructor(readonly currentStatus: string) {}
}

export class NothingToRefund {}

export class RefundLineUnknown {
  constructor(readonly ticketLineId: string) {}
}

// Se pidió devolver más de lo que queda por devolver de esa línea.
export class RefundExceedsSold {
  constructor(
    readonly ticketLineId: string,
    readonly remainingQuantity: number,
  ) {}
}

// La caja no puede pagar la devolución (cerrada o sin efectivo suficiente).
export class RefundCashUnavailable {
  constructor(readonly humanMessage: string) {}
}

export type RefundSaleResult =
  | SaleRefunded
  | TicketNotFoundForRefund
  | RefundNotAllowed
  | NothingToRefund
  | RefundLineUnknown
  | RefundExceedsSold
  | RefundCashUnavailable;
