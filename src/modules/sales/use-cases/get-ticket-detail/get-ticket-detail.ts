import type { Ticket } from '#modules/sales/domain/ticket.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';

export class GetTicketDetailInput {
  constructor(readonly ticketId: string) {}
}

export class TicketDetailFound {
  constructor(readonly ticket: Ticket) {}
}

export class TicketDetailNotFound {
  constructor(readonly ticketId: string) {}
}

export type GetTicketDetailResult = TicketDetailFound | TicketDetailNotFound;

export class GetTicketDetail {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async execute(input: GetTicketDetailInput): Promise<GetTicketDetailResult> {
    const ticket = await this.ticketRepository.findById(input.ticketId);
    if (ticket === null) {
      return new TicketDetailNotFound(input.ticketId);
    }
    return new TicketDetailFound(ticket);
  }
}
