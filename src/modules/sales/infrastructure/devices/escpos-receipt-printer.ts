import { CharacterSet, PrinterTypes, ThermalPrinter } from 'node-thermal-printer';
import type { FastifyBaseLogger } from 'fastify';

import type { Nullable } from '#shared/domain/nullable.js';
import { CashPayment, CreditPayment, YapePayment } from '#modules/sales/domain/payment.js';
import type { Refund } from '#modules/sales/domain/refund.js';
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
import type { PrinterConfigService } from '#modules/settings/use-cases/printer-config-service.js';
import type { CloseSummary, CloseSummaryPrinter } from '#modules/cash/ports/close-summary-printer.js';

function soles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

const METHOD_PRINT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  yape: 'Yape',
  card: 'Tarjeta',
  credit: 'Fiado',
};

export class EscPosReceiptPrinter implements ReceiptPrinter, CloseSummaryPrinter {
  constructor(
    // Fallback cuando no se eligió impresora en Ajustes → Equipos.
    private readonly envInterfacePath: string,
    private readonly printerConfig: PrinterConfigService,
    private readonly receiptConfig: ReceiptConfigService,
    private readonly logger: FastifyBaseLogger,
  ) {}

  // La impresora y el ancho se eligen en Ajustes → Equipos y aplican al
  // siguiente voucher, sin reiniciar el sistema.
  private async buildPrinter(): Promise<ThermalPrinter> {
    const config = await this.printerConfig.get();
    const interfacePath =
      config.printerName === null ? this.envInterfacePath : `printer:${config.printerName}`;
    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: interfacePath,
      characterSet: CharacterSet.PC858_EURO,
      width: config.paperWidthMm === 80 ? 48 : 32,
      removeSpecialCharacters: false,
    });
  }

  async printSaleReceipt(
    ticket: Ticket,
    changeCents: Nullable<number>,
    refunds: Refund[],
  ): Promise<PrintReceiptResult> {
    try {
      const printer = await this.buildPrinter();
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
        if (line.discountCents > 0) {
          printer.leftRight(detail, soles(line.grossCents));
          printer.leftRight('  Descuento', `-${soles(line.discountCents)}`);
        } else {
          printer.leftRight(detail, soles(line.totalCents));
        }
      }

      printer.drawLine();
      if (ticket.discountCents > 0) {
        printer.leftRight('Subtotal', soles(ticket.linesTotalCents));
        printer.leftRight('Descuento', `-${soles(ticket.discountCents)}`);
      }
      // El redondeo del total a 10 céntimos se muestra siempre que exista.
      if (ticket.roundingCents !== 0) {
        printer.leftRight(
          'Redondeo',
          `${ticket.roundingCents > 0 ? '+' : '-'}${soles(Math.abs(ticket.roundingCents))}`,
        );
      }
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

      // Reimpresión de una venta con devoluciones: el papel cuenta la verdad.
      if (refunds.length > 0) {
        const refundedTotal = refunds.reduce((sum, refund) => sum + refund.totalCents, 0);
        printer.drawLine();
        printer.println('DEVOLUCIONES');
        for (const refund of refunds) {
          for (const line of refund.lines) {
            printer.leftRight(
              `  ${line.description} ${refundQuantityLabel(ticket, line.ticketLineId, line.quantity)}`,
              '',
            );
          }
          printer.leftRight(
            `  ${refund.createdAt.toLocaleDateString('es-PE')} ${refund.refundedToCredit ? '(al fiado)' : '(efectivo)'}`,
            `-${soles(refund.totalCents)}`,
          );
        }
        printer.bold(true);
        printer.leftRight('QUEDA COBRADO', soles(ticket.totalCents - refundedTotal));
        printer.bold(false);
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

  // Constancia interna de devolución: se entrega al cliente con su plata.
  async printRefundReceipt(ticket: Ticket, refund: Refund): Promise<PrintReceiptResult> {
    try {
      const printer = await this.buildPrinter();
      const connected = await printer.isPrinterConnected();
      if (!connected) {
        return new PrinterUnavailable(
          'La impresora no responde. Revisa que esté prendida y con el cable USB conectado.',
        );
      }
      const config = await this.receiptConfig.get();
      printer.alignCenter();
      printer.bold(true);
      printer.println(config.storeName);
      printer.println('CONSTANCIA DE DEVOLUCION');
      printer.bold(false);
      printer.alignLeft();
      printer.println(
        `Venta #${ticket.number} · ${refund.createdAt.toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      );
      printer.println(`Motivo: ${refund.reason}`);
      printer.println(`Registro: ${refund.registeredBy}`);
      printer.drawLine();
      for (const line of refund.lines) {
        printer.leftRight(
          `${line.description} ${refundQuantityLabel(ticket, line.ticketLineId, line.quantity)}`,
          soles(line.amountCents),
        );
      }
      printer.drawLine();
      printer.bold(true);
      printer.leftRight('DEVUELTO', soles(refund.totalCents));
      printer.bold(false);
      printer.println(refund.refundedToCredit ? 'Abonado a la cuenta de fiado' : 'Pagado en efectivo');
      printer.newLine();
      printer.alignCenter();
      printer.println('Documento interno de control');
      printer.cut();
      await printer.execute();
      return new ReceiptPrinted();
    } catch (error) {
      this.logger.warn({
        event: 'printer_failed',
        msg: 'Fallo al imprimir la constancia de devolución',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return new PrinterUnavailable('No se pudo imprimir la constancia. Revisa la impresora.');
    }
  }

  // Reporte Z: resumen del turno en papel al cerrar la caja.
  async printCloseSummary(summary: CloseSummary): Promise<Nullable<string>> {
    try {
      const printer = await this.buildPrinter();
      const connected = await printer.isPrinterConnected();
      if (!connected) {
        return 'La impresora no responde. Revisa que esté prendida y con el cable USB conectado.';
      }
      const config = await this.receiptConfig.get();
      const { session, breakdown } = summary;

      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.println(config.storeName);
      printer.setTextNormal();
      printer.println('CIERRE DE CAJA');
      printer.bold(false);
      printer.alignLeft();
      printer.println(`Turno: ${session.shift === 'morning' ? 'manana' : 'tarde'}`);
      printer.println(`Abrio:  ${session.openedBy}  ${formatDateTime(session.openedAt)}`);
      if (session.closedAt !== null) {
        printer.println(`Cerro:  ${session.closedBy ?? '-'}  ${formatDateTime(session.closedAt)}`);
      }
      printer.drawLine();
      printer.leftRight('Fondo inicial', soles(breakdown.openingCents));
      printer.leftRight('Ventas en efectivo', soles(breakdown.cashSalesCents));
      printer.leftRight('Abonos en efectivo', soles(breakdown.cashAbonosCents));
      if (breakdown.depositsCents > 0) {
        printer.leftRight('Ingresos de efectivo', `+${soles(breakdown.depositsCents)}`);
      }
      printer.leftRight('Retiros', `-${soles(breakdown.withdrawalsCents)}`);
      printer.leftRight('Gastos', `-${soles(breakdown.expensesCents)}`);
      if (breakdown.refundsCents > 0) {
        printer.leftRight('Devoluciones', `-${soles(breakdown.refundsCents)}`);
      }
      printer.drawLine();
      printer.leftRight('Esperado en cajon', soles(session.expectedCashCents ?? 0));
      printer.leftRight('Contado', soles(session.countedCashCents ?? 0));
      printer.bold(true);
      printer.leftRight('Diferencia', soles(summary.differenceCents));
      printer.bold(false);
      printer.drawLine();
      printer.println('Ventas del turno por metodo:');
      for (const total of summary.salesByMethod) {
        printer.leftRight(
          `  ${METHOD_PRINT_LABELS[total.method] ?? total.method}`,
          soles(total.amountCents),
        );
      }
      printer.newLine();
      printer.alignCenter();
      printer.println('Documento interno de control');
      printer.cut();
      await printer.execute();
      return null;
    } catch (error) {
      this.logger.warn({
        event: 'printer_failed',
        msg: 'Fallo al imprimir el cierre de caja',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return 'No se pudo imprimir el resumen. Revisa la impresora e intenta de nuevo.';
    }
  }

  async printTestPage(): Promise<PrintReceiptResult> {
    try {
      const printer = await this.buildPrinter();
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

// Cantidad devuelta en humano: unidades como ×N, pesables en kg.
function refundQuantityLabel(ticket: Ticket, ticketLineId: string, quantity: number): string {
  const line = ticket.lines.find((item) => item.id === ticketLineId);
  const isWeight = line !== undefined && !(line instanceof UnitTicketLine);
  return isWeight ? `${(quantity / 1000).toFixed(3)} kg` : `x${quantity}`;
}

function formatDateTime(value: Date): string {
  return value.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// El cajón se abre con el pulso "kick" que envía la misma impresora.

export class EscPosCashDrawer implements CashDrawer {
  constructor(
    private readonly envInterfacePath: string,
    private readonly printerConfig: PrinterConfigService,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async open(): Promise<void> {
    try {
      const config = await this.printerConfig.get();
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface:
          config.printerName === null ? this.envInterfacePath : `printer:${config.printerName}`,
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
