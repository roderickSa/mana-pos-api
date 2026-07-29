export class CashPayment {
  constructor(readonly amountCents: number) {}
}

export class YapePayment {
  constructor(readonly amountCents: number) {}
}

export class CardPayment {
  constructor(readonly amountCents: number) {}
}

export class CreditPayment {
  constructor(
    readonly amountCents: number,
    readonly customerId: string,
  ) {}
}

export type Payment = CashPayment | YapePayment | CardPayment | CreditPayment;

export function paymentsTotalCents(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}
