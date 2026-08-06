import type { Refund } from '#modules/sales/domain/refund.js';

export interface RefundRepository {
  save(refund: Refund): Promise<void>;
  findByTicketId(ticketId: string): Promise<Refund[]>;
}
