import type { Nullable } from '#shared/domain/nullable.js';

export type PaymentMethodName = 'cash' | 'yape' | 'card' | 'credit';

export class TicketListItem {
  constructor(
    readonly id: string,
    readonly number: number,
    readonly status: 'charged' | 'voided',
    readonly totalCents: number,
    readonly chargedAt: Nullable<Date>,
    readonly methods: PaymentMethodName[],
    readonly userId: string,
    readonly customerName: Nullable<string>,
  ) {}
}

export class PaymentMethodTotal {
  constructor(
    readonly method: PaymentMethodName,
    readonly amountCents: number,
  ) {}
}

// Quién anuló cuánto en el período: control antihurto para el encargado.
export class VoidedByUser {
  constructor(
    readonly user: string,
    readonly count: number,
    readonly totalCents: number,
  ) {}
}

// Ventas cobradas agrupadas por quien las hizo (con dos usuarios ya rinde).
export class SoldByUser {
  constructor(
    readonly user: string,
    readonly count: number,
    readonly totalCents: number,
  ) {}
}

// Resumen del período filtrado: solo ventas cobradas (las anuladas no suman).
export class SalesSummary {
  constructor(
    readonly chargedCount: number,
    readonly chargedTotalCents: number,
    readonly byMethod: PaymentMethodTotal[],
    readonly voidedByUser: VoidedByUser[],
    readonly soldByUser: SoldByUser[],
  ) {}
}

export class TicketsPage {
  constructor(
    readonly items: TicketListItem[],
    readonly total: number,
    readonly summary: SalesSummary,
  ) {}
}
