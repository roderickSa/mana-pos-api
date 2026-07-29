import type { Nullable } from '#shared/domain/nullable.js';

// No se vende sin caja abierta: el checkout liga cada ticket a la sesión activa.
export interface CashSessionLookup {
  openSessionId(): Promise<Nullable<string>>;
}
