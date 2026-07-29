import type { Ticket } from '#modules/sales/domain/ticket.js';

export class TicketVoided {
  constructor(readonly ticket: Ticket) {}
}

// Replay: ya estaba anulado, no se revierte stock dos veces.
export class TicketAlreadyVoided {
  constructor(readonly ticket: Ticket) {}
}

export class TicketNotFound {
  constructor(readonly ticketId: string) {}
}

export class VoidNotAllowed {
  constructor(readonly currentStatus: string) {}
}

export type VoidTicketResult = TicketVoided | TicketAlreadyVoided | TicketNotFound | VoidNotAllowed;
