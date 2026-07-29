import type { TimeManager } from '#shared/ports/time-manager.js';
import type { CreditGateway } from '#modules/sales/ports/credit-gateway.js';
import type { StockDiscounter } from '#modules/sales/ports/stock-discounter.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import type { VoidTicketInput } from '#modules/sales/use-cases/void-ticket/void-ticket.input.js';
import {
  TicketAlreadyVoided,
  TicketNotFound,
  TicketVoided,
  VoidNotAllowed,
  type VoidTicketResult,
} from '#modules/sales/use-cases/void-ticket/void-ticket.output.js';

export class VoidTicket {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly stockDiscounter: StockDiscounter,
    private readonly creditGateway: CreditGateway,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: VoidTicketInput): Promise<VoidTicketResult> {
    const ticket = await this.ticketRepository.findById(input.ticketId);
    if (ticket === null) {
      return new TicketNotFound(input.ticketId);
    }
    if (ticket.isVoided()) {
      return new TicketAlreadyVoided(ticket);
    }
    if (!ticket.isCharged()) {
      return new VoidNotAllowed(ticket.status.name);
    }

    const voided = ticket.void(this.timeManager.now(), input.voidedBy);
    await this.ticketRepository.save(voided);
    await this.stockDiscounter.reverseSale(voided.id, input.voidedBy);
    await this.creditGateway.reverseCreditForTicket(voided.id, input.voidedBy);
    return new TicketVoided(voided);
  }
}
