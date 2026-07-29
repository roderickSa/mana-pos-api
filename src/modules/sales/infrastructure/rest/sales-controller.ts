import type { FastifyReply, FastifyRequest } from 'fastify';

import { exhaustive } from '#shared/domain/exhaustive.js';
import { Checkout } from '#modules/sales/use-cases/checkout/checkout.js';
import {
  CardPaymentOrder,
  CashPaymentOrder,
  CreditPaymentOrder,
  CheckoutInput,
  UnitLineOrder,
  WeightLineOrder,
  YapePaymentOrder,
  type LineOrder,
  type PaymentOrder,
} from '#modules/sales/use-cases/checkout/checkout.input.js';
import {
  CashReceivedInsufficient,
  CheckoutCompleted,
  CreditDeclinedAtCheckout,
  EmptyTicket,
  NoCashSessionOpen,
  PaymentsDoNotMatchTotal,
  ProductNotSellable,
  TicketAlreadyCharged,
} from '#modules/sales/use-cases/checkout/checkout.output.js';
import { VoidTicket } from '#modules/sales/use-cases/void-ticket/void-ticket.js';
import { VoidTicketInput } from '#modules/sales/use-cases/void-ticket/void-ticket.input.js';
import {
  TicketAlreadyVoided,
  TicketNotFound,
  TicketVoided,
  VoidNotAllowed,
} from '#modules/sales/use-cases/void-ticket/void-ticket.output.js';
import {
  checkoutDto,
  salesSearchDto,
  toTicketResponse,
  voidTicketDto,
} from '#modules/sales/infrastructure/rest/dtos/sales.dto.js';
import { SearchTickets } from '#modules/sales/use-cases/search-tickets/search-tickets.js';
import {
  ReceiptReprinted,
  ReprintNotAllowed,
  ReprintReceipt,
  ReprintReceiptInput,
  TicketNotFoundForReprint,
} from '#modules/sales/use-cases/reprint-receipt/reprint-receipt.js';
import { SearchTicketsInput } from '#modules/sales/use-cases/search-tickets/search-tickets.input.js';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  yape: 'Yape',
  card: 'Tarjeta',
  credit: 'Fiado',
};

export class SalesController {
  constructor(
    private readonly checkout: Checkout,
    private readonly voidTicket: VoidTicket,
    private readonly searchTickets: SearchTickets,
    private readonly reprintReceipt: ReprintReceipt,
  ) {}

  async doReprint(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.reprintReceipt.execute(new ReprintReceiptInput(ticketIdParam(request)));
    if (result instanceof ReceiptReprinted) {
      await reply.status(200).send({
        printerWarning: result.printerWarning,
        message:
          result.printerWarning ?? 'Voucher enviado a la impresora.',
      });
      return;
    }
    if (result instanceof TicketNotFoundForReprint) {
      await reply.status(404).send({ code: 'TICKET_NOT_FOUND', ticketId: result.ticketId });
      return;
    }
    if (result instanceof ReprintNotAllowed) {
      await reply.status(409).send({
        code: 'REPRINT_NOT_ALLOWED',
        message: 'Solo se pueden reimprimir ventas cobradas.',
      });
      return;
    }
    exhaustive(result);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = salesSearchDto.parse(request.query);
    const perPage = query.perPage ?? 25;
    const page = query.page ?? 1;
    const result = await this.searchTickets.execute(
      new SearchTicketsInput(
        parseFromDate(query.from),
        parseToDate(query.to),
        query.method ?? null,
        query.status ?? null,
        perPage,
        (page - 1) * perPage,
      ),
    );

    await reply.status(200).send({
      items: result.items.map((item) => ({
        id: item.id,
        number: item.number,
        status: item.status,
        totalCents: item.totalCents,
        chargedAt: item.chargedAt?.toISOString() ?? null,
        methods: item.methods,
        userId: item.userId,
      })),
      total: result.total,
      page,
      perPage,
      summary: {
        chargedCount: result.summary.chargedCount,
        chargedTotalCents: result.summary.chargedTotalCents,
        byMethod: result.summary.byMethod,
      },
    });
  }

  async exportCsv(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = salesSearchDto.parse(request.query);
    const result = await this.searchTickets.execute(
      new SearchTicketsInput(
        parseFromDate(query.from),
        parseToDate(query.to),
        query.method ?? null,
        query.status ?? null,
        5000,
        0,
      ),
    );

    const header = 'numero,fecha,hora,estado,metodos,total_soles,usuario';
    const rows = result.items.map((item) => {
      const chargedAt = item.chargedAt;
      const fecha = chargedAt === null ? '' : chargedAt.toLocaleDateString('es-PE');
      const hora =
        chargedAt === null
          ? ''
          : chargedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const metodos = item.methods.map((method) => METHOD_LABELS[method] ?? method).join('+');
      const estado = item.status === 'charged' ? 'cobrada' : 'anulada';
      return `${item.number},${fecha},${hora},${estado},${metodos},${(item.totalCents / 100).toFixed(2)},${item.userId}`;
    });
    const csv = `﻿${header}\n${rows.join('\n')}\n`;

    await reply
      .status(200)
      .header('content-disposition', 'attachment; filename="ventas-mana.csv"')
      .type('text/csv; charset=utf-8')
      .send(csv);
  }

  async doCheckout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = checkoutDto.parse(request.body);

    const lines: LineOrder[] = body.lines.map((line) =>
      line.saleType === 'unit'
        ? new UnitLineOrder(line.productId, line.quantity)
        : new WeightLineOrder(line.productId, line.grams, line.weightSource),
    );
    const paymentOrders: PaymentOrder[] = body.payments.map((payment) => {
      if (payment.method === 'cash') {
        return new CashPaymentOrder(payment.amountCents, payment.receivedCents ?? null);
      }
      if (payment.method === 'yape') {
        return new YapePaymentOrder(payment.amountCents);
      }
      if (payment.method === 'credit') {
        return new CreditPaymentOrder(payment.amountCents, payment.customerId);
      }
      return new CardPaymentOrder(payment.amountCents);
    });

    const result = await this.checkout.execute(
      new CheckoutInput(body.ticketId, lines, paymentOrders, body.userId),
    );

    if (result instanceof CheckoutCompleted) {
      await reply.status(201).send({
        ...toTicketResponse(result.ticket, result.changeCents),
        printerWarning: result.printerWarning,
      });
      return;
    }
    if (result instanceof TicketAlreadyCharged) {
      await reply.status(200).send({ ...toTicketResponse(result.ticket, null), printerWarning: null });
      return;
    }
    if (result instanceof EmptyTicket) {
      await reply.status(400).send({ code: 'EMPTY_TICKET', message: 'El ticket no tiene líneas.' });
      return;
    }
    if (result instanceof ProductNotSellable) {
      await reply.status(422).send({
        code: 'PRODUCT_NOT_SELLABLE',
        productId: result.productId,
        message: 'Un producto del ticket ya no está disponible. Quítalo y vuelve a cobrar.',
      });
      return;
    }
    if (result instanceof PaymentsDoNotMatchTotal) {
      await reply.status(409).send({
        code: 'PAYMENTS_DO_NOT_MATCH_TOTAL',
        totalCents: result.totalCents,
        paidCents: result.paidCents,
        message: 'Los pagos no cuadran con el total. Revisa los montos.',
      });
      return;
    }
    if (result instanceof NoCashSessionOpen) {
      await reply.status(409).send({
        code: 'CASH_SESSION_REQUIRED',
        message: 'La caja está cerrada. Ábrela en la sección Caja para empezar a vender.',
      });
      return;
    }
    if (result instanceof CreditDeclinedAtCheckout) {
      await reply.status(409).send({ code: 'CREDIT_DECLINED', message: result.humanMessage });
      return;
    }
    if (result instanceof CashReceivedInsufficient) {
      await reply.status(409).send({
        code: 'CASH_RECEIVED_INSUFFICIENT',
        requiredCents: result.requiredCents,
        receivedCents: result.receivedCents,
        message: 'El efectivo recibido no alcanza para el monto a pagar.',
      });
      return;
    }
    exhaustive(result);
  }

  async doVoid(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const ticketId = ticketIdParam(request);
    const body = voidTicketDto.parse(request.body ?? {});
    const result = await this.voidTicket.execute(new VoidTicketInput(ticketId, body.voidedBy));

    if (result instanceof TicketVoided || result instanceof TicketAlreadyVoided) {
      await reply.status(200).send(toTicketResponse(result.ticket, null));
      return;
    }
    if (result instanceof TicketNotFound) {
      await reply.status(404).send({ code: 'TICKET_NOT_FOUND', ticketId: result.ticketId });
      return;
    }
    if (result instanceof VoidNotAllowed) {
      await reply.status(409).send({
        code: 'VOID_NOT_ALLOWED',
        currentStatus: result.currentStatus,
        message: 'Este ticket no se puede anular en su estado actual.',
      });
      return;
    }
    exhaustive(result);
  }
}

// from = inicio del día; to = fin del día (los filtros son fechas locales YYYY-MM-DD).
function parseFromDate(value: string | undefined): Date | null {
  if (value === undefined) return null;
  return new Date(`${value}T00:00:00`);
}

function parseToDate(value: string | undefined): Date | null {
  if (value === undefined) return null;
  return new Date(`${value}T23:59:59.999`);
}

function ticketIdParam(request: FastifyRequest): string {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return params.id;
  }
  throw new Error('Missing id param');
}
