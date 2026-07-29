export class CreditAccepted {}

// humanMessage se muestra tal cual a la cajera.
export class CreditDeclined {
  constructor(readonly humanMessage: string) {}
}

export type CreditChargeResult = CreditAccepted | CreditDeclined;

export interface CreditGateway {
  // Idempotente por ticketId (un replay no duplica la deuda).
  chargeCredit(
    customerId: string,
    amountCents: number,
    ticketId: string,
    userId: string,
  ): Promise<CreditChargeResult>;
  // Idempotente: al anular una venta fiada, revierte la deuda una sola vez.
  reverseCreditForTicket(ticketId: string, userId: string): Promise<void>;
}
