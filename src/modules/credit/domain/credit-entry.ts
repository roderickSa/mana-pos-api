import type { Nullable } from '#shared/domain/nullable.js';

export type CreditEntryKind = 'charge' | 'payment';

// charge = venta al fiado (sube la deuda); payment = abono o reversa de una
// anulación (baja la deuda). paymentMethod solo aplica a abonos reales.
export class CreditEntry {
  constructor(
    readonly id: string,
    readonly customerId: string,
    readonly kind: CreditEntryKind,
    readonly amountCents: number,
    readonly ticketId: Nullable<string>,
    readonly paymentMethod: Nullable<'cash' | 'yape'>,
    readonly userId: string,
    readonly createdAt: Date,
  ) {}
}
