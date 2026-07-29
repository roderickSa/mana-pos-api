import type { FastifyBaseLogger } from 'fastify';

import type { Nullable } from '#shared/domain/nullable.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import {
  ReceiptPrinted,
  type CashDrawer,
  type PrintReceiptResult,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';

// Adapters simulados para desarrollar sin hardware. Los reales (ESC/POS y
// pulso al cajón) llegan con la tarea 5 y solo reemplazan estas clases.
export class SimulatedReceiptPrinter implements ReceiptPrinter {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async printSaleReceipt(ticket: Ticket, changeCents: Nullable<number>): Promise<PrintReceiptResult> {
    this.logger.info({
      event: 'simulated_receipt_printed',
      msg: `Voucher simulado del ticket #${ticket.number}`,
      data: { ticketId: ticket.id, totalCents: ticket.totalCents, changeCents },
    });
    return new ReceiptPrinted();
  }

  async printTestPage(): Promise<PrintReceiptResult> {
    this.logger.info({ event: 'simulated_test_page', msg: 'Página de prueba simulada' });
    return new ReceiptPrinted();
  }
}

export class SimulatedCashDrawer implements CashDrawer {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async open(): Promise<void> {
    this.logger.info({ event: 'simulated_cash_drawer_opened', msg: 'Cajón simulado abierto' });
  }
}
