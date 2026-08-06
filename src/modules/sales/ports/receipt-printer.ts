import type { Nullable } from '#shared/domain/nullable.js';
import type { Refund } from '#modules/sales/domain/refund.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';

export class ReceiptPrinted {}

// humanMessage se muestra tal cual a la cajera: en humano, nunca códigos técnicos.
export class PrinterUnavailable {
  constructor(readonly humanMessage: string) {}
}

export type PrintReceiptResult = ReceiptPrinted | PrinterUnavailable;

export interface ReceiptPrinter {
  // refunds: en la venta recién cobrada va vacío; en una reimpresión lleva
  // las devoluciones ya registradas para que el papel cuente la verdad.
  printSaleReceipt(
    ticket: Ticket,
    changeCents: Nullable<number>,
    refunds: Refund[],
  ): Promise<PrintReceiptResult>;
  // Constancia interna que se entrega al cliente al devolverle su plata.
  printRefundReceipt(ticket: Ticket, refund: Refund): Promise<PrintReceiptResult>;
  // Página de prueba desde la pantalla de Equipos.
  printTestPage(): Promise<PrintReceiptResult>;
}

export interface CashDrawer {
  // Nunca lanza: si el cajón falla, la venta ya está cobrada igual.
  open(): Promise<void>;
}
