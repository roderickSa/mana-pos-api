import type { Nullable } from '#shared/domain/nullable.js';
import type { CreditEntry } from '#modules/credit/domain/credit-entry.js';

export interface CreditLedger {
  append(entry: CreditEntry): Promise<void>;
  entriesOf(customerId: string): Promise<CreditEntry[]>;
  balanceOf(customerId: string): Promise<number>;
  balancesOf(customerIds: string[]): Promise<Map<string, number>>;
  chargeForTicket(ticketId: string): Promise<Nullable<CreditEntry>>;
  // ¿Ya existe la reversa (payment ligado al ticket) de una anulación?
  reversalExistsForTicket(ticketId: string): Promise<boolean>;
}
