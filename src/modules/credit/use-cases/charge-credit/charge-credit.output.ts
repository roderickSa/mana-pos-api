import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';

export class CreditCharged {
  constructor(readonly entry: CreditEntry) {}
}

// Replay del cobro: el cargo de este ticket ya existe.
export class CreditAlreadyCharged {
  constructor(readonly entry: CreditEntry) {}
}

export class CreditLimitExceeded {
  constructor(
    readonly limitCents: number,
    readonly balanceCents: number,
    readonly availableCents: number,
  ) {}
}

export class CustomerNotFoundForCredit {
  constructor(readonly customerId: string) {}
}

export type ChargeCreditResult =
  | CreditCharged
  | CreditAlreadyCharged
  | CreditLimitExceeded
  | CustomerNotFoundForCredit;
