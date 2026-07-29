import type { Nullable } from '#shared/domain/nullable.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import type { TicketsPage } from '#modules/sales/domain/sales-report.js';
import type { TicketSearchParams } from '#modules/sales/ports/ticket-search-params.js';

export interface TicketRepository {
  // Persiste ticket + líneas + pagos de forma atómica (upsert por id).
  save(ticket: Ticket): Promise<void>;
  findById(id: string): Promise<Nullable<Ticket>>;
  nextTicketNumber(): Promise<number>;
  // Histórico con filtros + resumen del período (solo cobradas suman).
  searchTickets(params: TicketSearchParams): Promise<TicketsPage>;
}
