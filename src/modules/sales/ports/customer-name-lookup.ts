import type { Nullable } from '#shared/domain/nullable.js';

// Nombre del cliente para mostrar en detalle y voucher; null si ya no existe.
export interface CustomerNameLookup {
  nameOf(customerId: string): Promise<Nullable<string>>;
}
