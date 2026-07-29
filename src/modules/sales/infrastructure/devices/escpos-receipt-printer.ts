import { CharacterSet, PrinterTypes, ThermalPrinter } from 'node-thermal-printer';
import type { FastifyBaseLogger } from 'fastify';

import type { Nullable } from '#shared/domain/nullable.js';
import { CashPayment, CreditPayment, YapePayment } from '#modules/sales/domain/payment.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import { UnitTicketLine } from '#modules/sales/domain/ticket-line.js';
import {
  PrinterUnavailable,
  ReceiptPrinted,
  type CashDrawer,
  type PrintReceiptResult,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import type { ReceiptConfigService } from '#modules/settings/use-cases/receipt-config-service.js';

function soles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export class EscPosReceiptPrinter implements ReceiptPrinter {
  constructor(
    private readonly interfacePath: string,
    private readonly paperWidthMm: 58 | 80,
    private readonly receiptConfig: ReceiptConfigService,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private buildPrinter(): ThermalPrinter {
    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: this.interfacePath,
      characterSet: CharacterSet.PC858_EURO,
      width: this.paperWidthMm === 80 ? 48 : 32,
      removeSpecialCharacters: false,
    });
  }

  async printSaleReceipt(ticket: Ticket, changeCents: Nullable<number>): Promise<PrintReceiptResult> {
    try {
      const printer = this.buildPrinter();
      const connected = await printer.isPrinterConnected();
      if (!connected) {
        return new PrinterUnavailable(
          'La impresora no responde. Revisa que esté prendida y con el cable USB conectado.',
        );
      }

      const config = await this.receiptConfig.get();
      printer.alignCenter();
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.println(config.storeName);
      printer.setTextNormal();
      printer.bold(false);
      if (config.headerExtra !== null) {
        printer.println(config.headerExtra);
      }
      printer.newLine();
      printer.alignLeft();
      const chargedAt = ticket.chargedAt ?? ticket.createdAt;
      printer.println(
        `Ticket #${ticket.number}  ${chargedAt.toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      );
      printer.println(`Atendio: ${ticket.userId}`);
      printer.drawLine();

      for (const line of ticket.lines) {
        printer.println(line.description);
        const detail =
          line instanceof UnitTicketLine
            ? `  ${line.quantity} x ${soles(line.unitPriceCents)}`
            : `  ${(line.grams / 1000).toFixed(3)} kg x ${soles(line.pricePerKgCents)}/kg`;
        printer.leftRight(detail, soles(line.totalCents));
      }

      printer.drawLine();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.leftRight('TOTAL', soles(ticket.totalCents));
      printer.setTextNormal();
      printer.bold(false);

      for (const payment of ticket.payments) {
        const method =
          payment instanceof CashPayment
            ? 'Efectivo'
            : payment instanceof YapePayment
              ? 'Yape'
              : payment instanceof CreditPayment
                ? 'Fiado'
                : 'Tarjeta';
        printer.leftRight(method, soles(payment.amountCents));
      }
      if (changeCents !== null && changeCents > 0) {
        printer.leftRight('Vuelto', soles(changeCents));
      }

      printer.newLine();
      printer.alignCenter();
      printer.println(config.footerMessage);
      printer.println('Comprobante interno - no valido como');
      printer.println('comprobante de pago');
      printer.cut();

      await printer.execute();
      return new ReceiptPrinted();
    } catch (error) {
      this.logger.warn({
        event: 'printer_failed',
        msg: 'Fallo al imprimir el voucher',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return new PrinterUnavailable('No se pudo imprimir el voucher. Revisa la impresora y reimprime.');
    }
  }

  async printTestPage(): Promise<PrintReceiptResult> {
    try {
      const printer = this.buildPrinter();
      const connected = await printer.isPrinterConnected();
      if (!connected) {
        return new PrinterUnavailable(
          'La impresora no responde. Revisa que esté prendida y con el cable USB conectado.',
        );
      }
      printer.alignCenter();
      printer.bold(true);
      printer.println('mana - pagina de prueba');
      printer.bold(false);
      printer.println('Si lees esto, la impresora esta lista.');
      printer.cut();
      await printer.execute();
      return new ReceiptPrinted();
    } catch {
      return new PrinterUnavailable('No se pudo imprimir la página de prueba. Revisa la impresora.');
    }
  }
}

// El cajón se abre con el pulso "kick" que envía la misma impresora.

export class EscPosCashDrawer implements CashDrawer {
  constructor(
    private readonly interfacePath: string,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async open(): Promise<void> {
    try {
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: this.interfacePath,
      });
      printer.openCashDrawer();
      await printer.execute();
    } catch (error) {
      // La venta ya está cobrada: el cajón se abre con la llave si hace falta.
      this.logger.warn({
        event: 'cash_drawer_failed',
        msg: 'No se pudo abrir el cajón automáticamente',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
