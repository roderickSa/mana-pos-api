import type { TicketsPage } from '#modules/sales/domain/sales-report.js';
import { TicketSearchParams } from '#modules/sales/ports/ticket-search-params.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import type { SearchTicketsInput } from '#modules/sales/use-cases/search-tickets/search-tickets.input.js';

export class SearchTickets {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(input: SearchTicketsInput): Promise<TicketsPage> {
    return this.ticketRepository.searchTickets(
      new TicketSearchParams(input.from, input.to, input.method, input.status, input.limit, input.offset),
    );
  }
}
