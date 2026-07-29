import type { Nullable } from '#shared/domain/nullable.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';

export class ReceiptPrinted {}

// humanMessage se muestra tal cual a la cajera: en humano, nunca códigos técnicos.
export class PrinterUnavailable {
  constructor(readonly humanMessage: string) {}
}

export type PrintReceiptResult = ReceiptPrinted | PrinterUnavailable;

export interface ReceiptPrinter {
  printSaleReceipt(ticket: Ticket, changeCents: Nullable<number>): Promise<PrintReceiptResult>;
  // Página de prueba desde la pantalla de Equipos.
  printTestPage(): Promise<PrintReceiptResult>;
}

export interface CashDrawer {
  // Nunca lanza: si el cajón falla, la venta ya está cobrada igual.
  open(): Promise<void>;
}
