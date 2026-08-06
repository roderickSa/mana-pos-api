import { CashPayment, CreditPayment } from '#modules/sales/domain/payment.js';
import { Ticket } from '#modules/sales/domain/ticket.js';
import { UnitTicketLine, WeightTicketLine } from '#modules/sales/domain/ticket-line.js';
import { RefundSale } from '#modules/sales/use-cases/refund-sale/refund-sale.js';
import {
  RefundLineOrder,
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
} from '#modules/sales/use-cases/refund-sale/refund-sale.output.js';
import {
  CreditGatewayForTesting,
  ReceiptPrinterForTesting,
  RefundCashForTesting,
  RefundRepositoryForTesting,
  StockDiscounterForTesting,
  TicketRepositoryForTesting,
} from '../test-doubles/sales-test-doubles.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

const AT = new Date('2026-08-05T10:00:00.000Z');

function chargedTicket(
  lines = [
    new UnitTicketLine('line-1', 'gaseosa', 'Inca Kola 600 ml', 3, 300, 0),
    new WeightTicketLine('line-2', 'papaya', 'Papaya', 500, 400, 'scale', 0),
  ],
  payments: (CashPayment | CreditPayment)[] = [new CashPayment(1100)],
  ticketDiscountCents = 0,
): Ticket {
  const open = Ticket.open('ticket-1', 7, lines, ticketDiscountCents, null, null, 'cajera-rosa', 'session-1', AT);
  return open.charge(payments, AT);
}

describe('RefundSale', () => {
  let ticketRepository: TicketRepositoryForTesting;
  let refundRepository: RefundRepositoryForTesting;
  let stockDiscounter: StockDiscounterForTesting;
  let creditGateway: CreditGatewayForTesting;
  let refundCash: RefundCashForTesting;
  let printer: ReceiptPrinterForTesting;
  let useCase: RefundSale;

  beforeEach(() => {
    ticketRepository = new TicketRepositoryForTesting();
    refundRepository = new RefundRepositoryForTesting();
    stockDiscounter = new StockDiscounterForTesting();
    creditGateway = new CreditGatewayForTesting();
    refundCash = new RefundCashForTesting();
    printer = new ReceiptPrinterForTesting();
    useCase = new RefundSale(
      ticketRepository,
      refundRepository,
      stockDiscounter,
      creditGateway,
      refundCash,
      printer,
      new IdGeneratorForTesting(),
      new TimeManagerForTesting(),
    );
  });

  function inputOf(lines: RefundLineOrder[], reason = 'producto vencido'): RefundSaleInput {
    return new RefundSaleInput('ticket-1', lines, reason, 'Encargado');
  }

  it('refunds one unit in cash, returns stock and records the refund', async () => {
    await ticketRepository.save(chargedTicket());

    const result = await useCase.execute(inputOf([new RefundLineOrder('line-1', 1)]));

    expect(result).toBeInstanceOf(SaleRefunded);
    if (!(result instanceof SaleRefunded)) return;
    // 1 de 3 unidades de una línea de 900 = 300.
    expect(result.refund.totalCents).toBe(300);
    expect(result.refund.refundedToCredit).toBe(false);
    expect(refundCash.payouts).toEqual([
      { amountCents: 300, concept: 'Devolución venta #7', userId: 'Encargado' },
    ]);
    expect(stockDiscounter.refundReturns).toHaveLength(1);
    expect(stockDiscounter.refundReturns[0]?.items.map((item) => item.quantity)).toEqual([1]);
    expect(refundRepository.all()).toHaveLength(1);
    expect(printer.refundReceipts).toHaveLength(1);
  });

  it('refunds proportionally when the ticket had a whole-ticket discount', async () => {
    // Líneas suman 1100, ticket con 100 de descuento → el cliente pagó 1000.
    await ticketRepository.save(chargedTicket(undefined, [new CashPayment(1000)], 100));

    const result = await useCase.execute(inputOf([new RefundLineOrder('line-2', 500)]));

    expect(result).toBeInstanceOf(SaleRefunded);
    if (!(result instanceof SaleRefunded)) return;
    // Papaya completa: 200 × (1000/1100) ≈ 181.8 → 180 (el efectivo peruano
    // baja hasta 10 céntimos; nunca más de lo pagado).
    expect(result.refund.totalCents).toBe(180);
  });

  it('always pays refunds in multiples of 10 cents (caso venta #32)', async () => {
    // Galleta 2×450 + Arroz 420 = 1370... con descuento de ticket de 20:
    // líneas 1320, total pagado 1300 — devolver el arroz daba S/4.14.
    const lines = [
      new UnitTicketLine('galleta', 'galleta-soda', 'Galleta Soda 6 pack', 2, 450, 0),
      new UnitTicketLine('arroz', 'arroz-costeno', 'Arroz Costeño 750 g', 1, 420, 0),
    ];
    await ticketRepository.save(chargedTicket(lines, [new CashPayment(1300)], 20));

    const result = await useCase.execute(inputOf([new RefundLineOrder('arroz', 1)]));

    expect(result).toBeInstanceOf(SaleRefunded);
    if (!(result instanceof SaleRefunded)) return;
    // 420 × (1300/1320) = 413.6 → 410, no 414.
    expect(result.refund.totalCents).toBe(410);
    expect(result.refund.totalCents % 10).toBe(0);
  });

  it('caps repeated per-unit refunds so they never exceed the line total', async () => {
    // 4 unidades a 1.00 con mitad de descuento del ticket: línea vale 50.
    const lines = [new UnitTicketLine('line-1', 'caramelo', 'Caramelo', 4, 25, 0)];
    await ticketRepository.save(chargedTicket(lines, [new CashPayment(50)], 50));

    let paid = 0;
    for (let i = 0; i < 4; i += 1) {
      const result = await useCase.execute(inputOf([new RefundLineOrder('line-1', 1)]));
      expect(result).toBeInstanceOf(SaleRefunded);
      if (result instanceof SaleRefunded) paid += result.refund.totalCents;
    }
    expect(paid).toBe(50);
  });

  it('refunds a credit sale as an abono to the customer debt, without cash', async () => {
    await ticketRepository.save(chargedTicket(undefined, [new CreditPayment(1100, 'cliente-1')]));

    const result = await useCase.execute(inputOf([new RefundLineOrder('line-1', 3)]));

    expect(result).toBeInstanceOf(SaleRefunded);
    if (!(result instanceof SaleRefunded)) return;
    expect(result.refund.refundedToCredit).toBe(true);
    expect(creditGateway.creditRefunds).toEqual([{ ticketId: 'ticket-1', amountCents: 900 }]);
    expect(refundCash.payouts).toHaveLength(0);
  });

  it('rejects refunding more than what remains, across multiple refunds', async () => {
    await ticketRepository.save(chargedTicket());

    await useCase.execute(inputOf([new RefundLineOrder('line-1', 2)]));
    const result = await useCase.execute(inputOf([new RefundLineOrder('line-1', 2)]));

    expect(result).toBeInstanceOf(RefundExceedsSold);
    if (!(result instanceof RefundExceedsSold)) return;
    expect(result.remainingQuantity).toBe(1);
  });

  it('fails without touching stock when the drawer cannot pay', async () => {
    await ticketRepository.save(chargedTicket());
    refundCash.rejectWith('No hay suficiente efectivo en caja para pagar esta devolución.');

    const result = await useCase.execute(inputOf([new RefundLineOrder('line-1', 1)]));

    expect(result).toBeInstanceOf(RefundCashUnavailable);
    expect(stockDiscounter.refundReturns).toHaveLength(0);
    expect(refundRepository.all()).toHaveLength(0);
  });

  it('rejects unknown tickets, foreign lines, voided sales and empty refunds', async () => {
    expect(await useCase.execute(inputOf([new RefundLineOrder('line-1', 1)]))).toBeInstanceOf(
      TicketNotFoundForRefund,
    );

    await ticketRepository.save(chargedTicket());
    expect(await useCase.execute(inputOf([new RefundLineOrder('otra-linea', 1)]))).toBeInstanceOf(
      RefundLineUnknown,
    );
    expect(await useCase.execute(inputOf([]))).toBeInstanceOf(NothingToRefund);

    const voided = chargedTicket().void(AT, 'Encargado', 'error');
    await ticketRepository.save(voided);
    expect(await useCase.execute(inputOf([new RefundLineOrder('line-1', 1)]))).toBeInstanceOf(
      RefundNotAllowed,
    );
  });
});
