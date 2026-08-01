import type { Nullable } from '#shared/domain/nullable.js';

export type CashShift = 'morning' | 'afternoon';

export class OpenCashSessionStatus {
  readonly name: 'open' = 'open';
}

export class ClosedCashSessionStatus {
  readonly name: 'closed' = 'closed';
}

export type CashSessionStatus = OpenCashSessionStatus | ClosedCashSessionStatus;

export class CashSession {
  constructor(
    readonly id: string,
    readonly shift: CashShift,
    readonly status: CashSessionStatus,
    readonly openedBy: string,
    readonly openedAt: Date,
    readonly openingAmountCents: number,
    readonly closedBy: Nullable<string>,
    readonly closedAt: Nullable<Date>,
    readonly expectedCashCents: Nullable<number>,
    readonly countedCashCents: Nullable<number>,
  ) {}

  static open(
    id: string,
    shift: CashShift,
    openedBy: string,
    openingAmountCents: number,
    at: Date,
  ): CashSession {
    return new CashSession(
      id,
      shift,
      new OpenCashSessionStatus(),
      openedBy,
      at,
      openingAmountCents,
      null,
      null,
      null,
      null,
    );
  }

  isOpen(): boolean {
    return this.status instanceof OpenCashSessionStatus;
  }

  close(expectedCashCents: number, countedCashCents: number, closedBy: string, at: Date): CashSession {
    return new CashSession(
      this.id,
      this.shift,
      new ClosedCashSessionStatus(),
      this.openedBy,
      this.openedAt,
      this.openingAmountCents,
      closedBy,
      at,
      expectedCashCents,
      countedCashCents,
    );
  }
}

export class CashMovement {
  constructor(
    readonly id: string,
    readonly cashSessionId: string,
    readonly kind: 'withdrawal' | 'expense' | 'deposit',
    readonly amountCents: number,
    readonly concept: string,
    readonly userId: string,
    readonly createdAt: Date,
  ) {}
}

// Desglose del efectivo actual de la sesión, para mostrar y para el corte.
export class CashBreakdown {
  constructor(
    readonly openingCents: number,
    readonly cashSalesCents: number,
    readonly cashAbonosCents: number,
    readonly withdrawalsCents: number,
    readonly expensesCents: number,
    // Refuerzos de fondo a media jornada (sencillo que entra, no venta).
    readonly depositsCents: number,
  ) {}

  get currentCashCents(): number {
    return (
      this.openingCents +
      this.cashSalesCents +
      this.cashAbonosCents +
      this.depositsCents -
      this.withdrawalsCents -
      this.expensesCents
    );
  }
}
