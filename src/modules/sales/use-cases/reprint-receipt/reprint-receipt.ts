import type { Nullable } from '#shared/domain/nullable.js';
import {
  PrinterUnavailable,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';

export class ReprintReceiptInput {
  constructor(readonly ticketId: string) {}
}

export class ReceiptReprinted {
  constructor(readonly printerWarning: Nullable<string>) {}
}

export class TicketNotFoundForReprint {
  constructor(readonly ticketId: string) {}
}

// Solo se reimprimen ventas cobradas: un voucher de una venta anulada confunde.
export class ReprintNotAllowed {
  constructor(readonly status: string) {}
}

export type ReprintReceiptResult = ReceiptReprinted | TicketNotFoundForReprint | ReprintNotAllowed;

export class ReprintReceipt {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly receiptPrinter: ReceiptPrinter,
  ) {}

  async execute(input: ReprintReceiptInput): Promise<ReprintReceiptResult> {
    const ticket = await this.ticketRepository.findById(input.ticketId);
    if (ticket === null) {
      return new TicketNotFoundForReprint(input.ticketId);
    }
    if (!ticket.isCharged()) {
      return new ReprintNotAllowed(ticket.status.name);
    }

    const result = await this.receiptPrinter.printSaleReceipt(ticket, null);
    return new ReceiptReprinted(result instanceof PrinterUnavailable ? result.humanMessage : null);
  }
}
