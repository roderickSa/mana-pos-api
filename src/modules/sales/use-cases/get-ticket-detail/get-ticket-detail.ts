import type { Nullable } from '#shared/domain/nullable.js';
import type { Refund } from '#modules/sales/domain/refund.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import type { CustomerNameLookup } from '#modules/sales/ports/customer-name-lookup.js';
import type { RefundRepository } from '#modules/sales/ports/refund-repository.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';

export class GetTicketDetailInput {
  constructor(readonly ticketId: string) {}
}

export class TicketDetailFound {
  constructor(
    readonly ticket: Ticket,
    readonly refunds: Refund[],
    readonly customerName: Nullable<string>,
  ) {}
}

export class TicketDetailNotFound {
  constructor(readonly ticketId: string) {}
}

export type GetTicketDetailResult = TicketDetailFound | TicketDetailNotFound;

export class GetTicketDetail {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly refundRepository: RefundRepository,
    private readonly customerNames: CustomerNameLookup,
  ) {}

  async execute(input: GetTicketDetailInput): Promise<GetTicketDetailResult> {
    const ticket = await this.ticketRepository.findById(input.ticketId);
    if (ticket === null) {
      return new TicketDetailNotFound(input.ticketId);
    }
    const refunds = await this.refundRepository.findByTicketId(ticket.id);
    const customerName =
      ticket.customerId === null ? null : await this.customerNames.nameOf(ticket.customerId);
    return new TicketDetailFound(ticket, refunds, customerName);
  }
}
