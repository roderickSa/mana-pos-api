import type { Nullable } from '#shared/domain/nullable.js';

export class Customer {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly document: Nullable<string>,
    readonly creditLimitCents: number,
    readonly createdAt: Date,
  ) {}
}

export class CustomerAccount {
  constructor(
    readonly customer: Customer,
    // Deuda actual: cargos − abonos. Nunca debería ser negativa.
    readonly balanceCents: number,
    // Desde cuándo debe: fecha del cargo que abrió la deuda vigente
    // (null si no debe nada). No es lo mismo deber desde ayer que hace 2 meses.
    readonly debtSince: Nullable<Date>,
  ) {}

  get availableCents(): number {
    return Math.max(0, this.customer.creditLimitCents - this.balanceCents);
  }
}
