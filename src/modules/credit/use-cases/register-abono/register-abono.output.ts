import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';

export class AbonoRegistered {
  constructor(
    readonly entry: CreditEntry,
    readonly newBalanceCents: number,
  ) {}
}

export class AbonoExceedsDebt {
  constructor(readonly debtCents: number) {}
}

export class CustomerNotFoundForAbono {
  constructor(readonly customerId: string) {}
}

export type RegisterAbonoResult = AbonoRegistered | AbonoExceedsDebt | CustomerNotFoundForAbono;
