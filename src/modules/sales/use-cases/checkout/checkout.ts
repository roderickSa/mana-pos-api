import type { Nullable } from '#shared/domain/nullable.js';
import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import {
  CardPayment,
  CashPayment,
  CreditPayment,
  YapePayment,
  paymentsTotalCents,
  type Payment,
} from '#modules/sales/domain/payment.js';
import { Ticket } from '#modules/sales/domain/ticket.js';
import {
  UnitTicketLine,
  WeightTicketLine,
  type TicketLine,
} from '#modules/sales/domain/ticket-line.js';
import type { ProductCatalog } from '#modules/sales/ports/product-catalog.js';
import {
  PrinterUnavailable,
  type CashDrawer,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import { SaleStockItem, type StockDiscounter } from '#modules/sales/ports/stock-discounter.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import {
  CardPaymentOrder,
  CashPaymentOrder,
  CreditPaymentOrder,
  UnitLineOrder,
  WeightLineOrder,
  YapePaymentOrder,
  type CheckoutInput,
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
  type CheckoutResult,
} from '#modules/sales/use-cases/checkout/checkout.output.js';
import { CreditDeclined, type CreditGateway } from '#modules/sales/ports/credit-gateway.js';
import type { CashSessionLookup } from '#modules/sales/ports/cash-session-lookup.js';

export class Checkout {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly productCatalog: ProductCatalog,
    private readonly stockDiscounter: StockDiscounter,
    private readonly creditGateway: CreditGateway,
    private readonly cashSessionLookup: CashSessionLookup,
    private readonly receiptPrinter: ReceiptPrinter,
    private readonly cashDrawer: CashDrawer,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    if (input.lines.length === 0) {
      return new EmptyTicket();
    }

    const existing = await this.ticketRepository.findById(input.ticketId);
    if (existing !== null) {
      return new TicketAlreadyCharged(existing);
    }

    const cashSessionId = await this.cashSessionLookup.openSessionId();
    if (cashSessionId === null) {
      return new NoCashSessionOpen();
    }

    const lines = await this.buildLines(input);
    if (lines instanceof ProductNotSellable) {
      return lines;
    }

    const now = this.timeManager.now();
    const number = await this.ticketRepository.nextTicketNumber();
    const openTicket = Ticket.open(input.ticketId, number, lines, input.userId, cashSessionId, now);

    const totalCents = openTicket.totalCents;
    const payments = input.payments.map((order) => toPayment(order));
    const paidCents = paymentsTotalCents(payments);
    if (paidCents !== totalCents) {
      return new PaymentsDoNotMatchTotal(totalCents, paidCents);
    }

    const changeCents = computeCashChange(input.payments);
    if (changeCents instanceof CashReceivedInsufficient) {
      return changeCents;
    }

    // El fiado se autoriza ANTES de persistir la venta; es idempotente por ticket.
    const creditOrder = input.payments.find((order) => order instanceof CreditPaymentOrder);
    if (creditOrder instanceof CreditPaymentOrder) {
      const creditResult = await this.creditGateway.chargeCredit(
        creditOrder.customerId,
        creditOrder.amountCents,
        input.ticketId,
        input.userId,
      );
      if (creditResult instanceof CreditDeclined) {
        return new CreditDeclinedAtCheckout(creditResult.humanMessage);
      }
    }

    const chargedTicket = openTicket.charge(payments, now);
    await this.ticketRepository.save(chargedTicket);

    await this.stockDiscounter.discountForSale(
      chargedTicket.id,
      chargedTicket.lines.map(
        (line) =>
          new SaleStockItem(
            line.productId,
            line instanceof WeightTicketLine ? line.grams : line.quantity,
            line.totalCents,
          ),
      ),
      input.userId,
    );

    const hasCash = payments.some((payment) => payment instanceof CashPayment);
    if (hasCash) {
      await this.cashDrawer.open();
    }

    const printResult = await this.receiptPrinter.printSaleReceipt(chargedTicket, changeCents);
    const printerWarning: Nullable<string> =
      printResult instanceof PrinterUnavailable ? printResult.humanMessage : null;

    return new CheckoutCompleted(chargedTicket, changeCents, printerWarning);
  }

  private async buildLines(input: CheckoutInput): Promise<TicketLine[] | ProductNotSellable> {
    const lines: TicketLine[] = [];
    for (const order of input.lines) {
      const product = await this.productCatalog.findForSale(order.productId);
      if (product === null || !product.active) {
        return new ProductNotSellable(order.productId);
      }
      if (order instanceof UnitLineOrder && product.saleType === 'unit') {
        lines.push(
          new UnitTicketLine(
            this.idGenerator.generate(),
            product.id,
            product.name,
            order.quantity,
            product.priceCents,
          ),
        );
        continue;
      }
      if (order instanceof WeightLineOrder && product.saleType === 'weight') {
        lines.push(
          new WeightTicketLine(
            this.idGenerator.generate(),
            product.id,
            product.name,
            order.grams,
            product.priceCents,
            order.weightSource,
          ),
        );
        continue;
      }
      // El tipo de línea no coincide con el tipo del producto: no se puede vender así.
      return new ProductNotSellable(order.productId);
    }
    return lines;
  }
}

function toPayment(order: PaymentOrder): Payment {
  if (order instanceof CashPaymentOrder) {
    return new CashPayment(order.amountCents);
  }
  if (order instanceof YapePaymentOrder) {
    return new YapePayment(order.amountCents);
  }
  if (order instanceof CardPaymentOrder) {
    return new CardPayment(order.amountCents);
  }
  return new CreditPayment(order.amountCents, order.customerId);
}

function computeCashChange(orders: PaymentOrder[]): number | CashReceivedInsufficient {
  let change = 0;
  for (const order of orders) {
    if (order instanceof CashPaymentOrder && order.receivedCents !== null) {
      if (order.receivedCents < order.amountCents) {
        return new CashReceivedInsufficient(order.amountCents, order.receivedCents);
      }
      change += order.receivedCents - order.amountCents;
    }
  }
  return change;
}
