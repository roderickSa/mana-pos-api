export class RefundCashPaid {}

// La caja no puede pagar la devolución (cerrada o sin efectivo suficiente).
export class RefundCashRejected {
  constructor(readonly humanMessage: string) {}
}

export type RefundCashResult = RefundCashPaid | RefundCashRejected;

export interface RefundCash {
  payOutRefund(amountCents: number, concept: string, userId: string): Promise<RefundCashResult>;
}
