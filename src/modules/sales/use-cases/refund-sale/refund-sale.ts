import { roundToDime } from '#shared/domain/dime.js';
import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CreditPayment } from '#modules/sales/domain/payment.js';
import { Refund, RefundLine } from '#modules/sales/domain/refund.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import { WeightTicketLine, type TicketLine } from '#modules/sales/domain/ticket-line.js';
import type { CreditGateway } from '#modules/sales/ports/credit-gateway.js';
import { RefundCashRejected, type RefundCash } from '#modules/sales/ports/refund-cash.js';
import {
  PrinterUnavailable,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import type { RefundRepository } from '#modules/sales/ports/refund-repository.js';
import { SaleStockItem, type StockDiscounter } from '#modules/sales/ports/stock-discounter.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import type {
  RefundSaleInput,
} from '#modules/sales/use-cases/refund-sale/refund-sale.input.js';
import {
  NothingToRefund,
  RefundCashUnavailable,
  RefundExceedsSold,
  RefundLineUnknown,
  RefundNotAllowed,
  SaleRefunded,
  TicketNotFoundForRefund,
  type RefundSaleResult,
} from '#modules/sales/use-cases/refund-sale/refund-sale.output.js';

function soldQuantityOf(line: TicketLine): number {
  return line instanceof WeightTicketLine ? line.grams : line.quantity;
}

export class RefundSale {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly refundRepository: RefundRepository,
    private readonly stockDiscounter: StockDiscounter,
    private readonly creditGateway: CreditGateway,
    private readonly refundCash: RefundCash,
    private readonly receiptPrinter: ReceiptPrinter,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RefundSaleInput): Promise<RefundSaleResult> {
    if (input.lines.length === 0) {
      return new NothingToRefund();
    }

    const ticket = await this.ticketRepository.findById(input.ticketId);
    if (ticket === null) {
      return new TicketNotFoundForRefund(input.ticketId);
    }
    if (!ticket.isCharged()) {
      return new RefundNotAllowed(ticket.status.name);
    }

    const previous = await this.refundRepository.findByTicketId(ticket.id);
    const lines = this.buildRefundLines(input, ticket, previous);
    if (lines instanceof RefundLineUnknown || lines instanceof RefundExceedsSold) {
      return lines;
    }

    const totalCents = this.payoutCents(lines, ticket, previous);

    // Venta fiada: la plata vuelve como abono a la deuda. El resto, en efectivo.
    const hasCreditPayment = ticket.payments.some((payment) => payment instanceof CreditPayment);
    let refundedToCredit = false;
    if (hasCreditPayment && totalCents > 0) {
      refundedToCredit = await this.creditGateway.refundToCredit(
        ticket.id,
        totalCents,
        input.registeredBy,
      );
    }
    if (!refundedToCredit && totalCents > 0) {
      const cashResult = await this.refundCash.payOutRefund(
        totalCents,
        `Devolución venta #${ticket.number}`,
        input.registeredBy,
      );
      if (cashResult instanceof RefundCashRejected) {
        return new RefundCashUnavailable(cashResult.humanMessage);
      }
    }

    const refundId = this.idGenerator.generate();
    const refund = new Refund(
      refundId,
      ticket.id,
      lines.map(
        (line, index) =>
          new RefundLine(
            `${refundId}-${index}`,
            line.ticketLineId,
            line.productId,
            line.description,
            line.quantity,
            line.amountCents,
          ),
      ),
      input.reason,
      input.registeredBy,
      refundedToCredit,
      totalCents,
      this.timeManager.now(),
    );
    await this.refundRepository.save(refund);

    await this.stockDiscounter.returnForRefund(
      ticket.id,
      refund.id,
      refund.lines.map(
        (line) => new SaleStockItem(line.productId, line.quantity, line.amountCents),
      ),
      input.registeredBy,
    );

    // Constancia en papel para el cliente; si la impresora falla, la
    // devolución igual queda registrada y se avisa en humano.
    const printResult = await this.receiptPrinter.printRefundReceipt(ticket, refund);
    return new SaleRefunded(
      refund,
      printResult instanceof PrinterUnavailable ? printResult.humanMessage : null,
    );
  }

  // Valida cantidades contra lo vendido menos lo ya devuelto y calcula el
  // monto de cada línea EXACTO al céntimo, proporcional a lo que el cliente
  // pagó de verdad (netos de descuentos y del redondeo del ticket). El
  // redondeo a 10 céntimos se aplica UNA sola vez, sobre el total de la tanda
  // — nunca por línea, que acumularía pérdida.
  private buildRefundLines(
    input: RefundSaleInput,
    ticket: Ticket,
    previous: Refund[],
  ): RefundLine[] | RefundLineUnknown | RefundExceedsSold {
    const refundedByLine = new Map<string, number>();
    const refundedAmountByLine = new Map<string, number>();
    for (const refund of previous) {
      for (const line of refund.lines) {
        refundedByLine.set(
          line.ticketLineId,
          (refundedByLine.get(line.ticketLineId) ?? 0) + line.quantity,
        );
        refundedAmountByLine.set(
          line.ticketLineId,
          (refundedAmountByLine.get(line.ticketLineId) ?? 0) + line.amountCents,
        );
      }
    }

    // total/linesTotal reparte proporcionalmente descuento de ticket y redondeo.
    const ticketFactor =
      ticket.linesTotalCents > 0 ? ticket.totalCents / ticket.linesTotalCents : 1;

    const lines: RefundLine[] = [];
    for (const order of input.lines) {
      const ticketLine = ticket.lines.find((line) => line.id === order.ticketLineId);
      if (ticketLine === undefined) {
        return new RefundLineUnknown(order.ticketLineId);
      }
      const soldQuantity = soldQuantityOf(ticketLine);
      const remaining = soldQuantity - (refundedByLine.get(ticketLine.id) ?? 0);
      if (order.quantity <= 0 || order.quantity > remaining) {
        return new RefundExceedsSold(ticketLine.id, Math.max(0, remaining));
      }
      // El tope por línea evita que devolver de a pocos "fabrique" céntimos;
      // completar la línea absorbe el redondeo y paga exactamente lo que faltaba.
      const lineMoneyCap = Math.round(ticketLine.totalCents * ticketFactor);
      const alreadyPaid = refundedAmountByLine.get(ticketLine.id) ?? 0;
      const remainingMoney = Math.max(0, lineMoneyCap - alreadyPaid);
      const amountCents =
        order.quantity === remaining
          ? remainingMoney
          : Math.min(
              Math.round(((ticketLine.totalCents * order.quantity) / soldQuantity) * ticketFactor),
              remainingMoney,
            );
      lines.push(
        new RefundLine(
          '',
          ticketLine.id,
          ticketLine.productId,
          ticketLine.description,
          order.quantity,
          amountCents,
        ),
      );
    }
    return lines;
  }

  // Lo que se paga por la tanda: el exacto redondeado a la diez, sin superar
  // jamás lo que queda por devolver del ticket. Si esta tanda deja TODO el
  // ticket devuelto, paga exactamente lo que faltaba (cierre a cero).
  private payoutCents(lines: RefundLine[], ticket: Ticket, previous: Refund[]): number {
    const exact = lines.reduce((sum, line) => sum + line.amountCents, 0);
    const alreadyPaid = previous.reduce((sum, refund) => sum + refund.totalCents, 0);
    const remaining = Math.max(0, ticket.totalCents - alreadyPaid);

    const refundedByLine = new Map<string, number>();
    for (const refund of previous) {
      for (const line of refund.lines) {
        refundedByLine.set(
          line.ticketLineId,
          (refundedByLine.get(line.ticketLineId) ?? 0) + line.quantity,
        );
      }
    }
    for (const line of lines) {
      refundedByLine.set(
        line.ticketLineId,
        (refundedByLine.get(line.ticketLineId) ?? 0) + line.quantity,
      );
    }
    const completesEverything = ticket.lines.every(
      (line) => (refundedByLine.get(line.id) ?? 0) >= soldQuantityOf(line),
    );
    if (completesEverything) {
      return remaining;
    }
    return Math.min(roundToDime(exact), remaining);
  }
}
