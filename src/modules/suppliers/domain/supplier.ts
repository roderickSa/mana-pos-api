import type { Nullable } from '#shared/domain/nullable.js';

export class Supplier {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly notes: Nullable<string>,
    // Días de visita del proveedor ('lun'…'dom'): alimentan la sugerencia
    // de órdenes de compra. Vacío = sin rutina conocida.
    readonly visitDays: string[],
    readonly contactName: Nullable<string>,
    readonly paymentTerms: Nullable<string>,
    readonly active: boolean,
    readonly createdAt: Date,
  ) {}
}
