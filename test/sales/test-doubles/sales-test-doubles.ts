import type { Nullable } from '#shared/domain/nullable.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import { ForSaleProduct, type ProductCatalog } from '#modules/sales/ports/product-catalog.js';
import {
  ReceiptPrinted,
  type CashDrawer,
  type PrintReceiptResult,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import type { SaleStockItem, StockDiscounter } from '#modules/sales/ports/stock-discounter.js';
import {
  CreditAccepted,
  type CreditChargeResult,
  type CreditGateway,
} from '#modules/sales/ports/credit-gateway.js';
import type { TicketRepository } from '#modules/sales/ports/ticket-repository.js';
import type { Refund } from '#modules/sales/domain/refund.js';
import type { RefundRepository } from '#modules/sales/ports/refund-repository.js';
import {
  RefundCashPaid,
  RefundCashRejected,
  type RefundCash,
  type RefundCashResult,
} from '#modules/sales/ports/refund-cash.js';
import {
  SalesSummary,
  TicketListItem,
  TicketsPage,
} from '#modules/sales/domain/sales-report.js';
import type { TicketSearchParams } from '#modules/sales/ports/ticket-search-params.js';
import type { CashSessionLookup } from '#modules/sales/ports/cash-session-lookup.js';
import type { Nullable as NullableSession } from '#shared/domain/nullable.js';

export class TicketRepositoryForTesting implements TicketRepository {
  private readonly ticketsById = new Map<string, Ticket>();

  async save(ticket: Ticket): Promise<void> {
    this.ticketsById.set(ticket.id, ticket);
  }

  async findById(id: string): Promise<Nullable<Ticket>> {
    return this.ticketsById.get(id) ?? null;
  }

  async nextTicketNumber(): Promise<number> {
    let max = 0;
    for (const ticket of this.ticketsById.values()) {
      max = Math.max(max, ticket.number);
    }
    return max + 1;
  }

  async searchTickets(params: TicketSearchParams): Promise<TicketsPage> {
    const all = [...this.ticketsById.values()];
    const items = all
      .slice(params.offset, params.offset + params.limit)
      .map(
        (ticket) =>
          new TicketListItem(
            ticket.id,
            ticket.number,
            ticket.isVoided() ? 'voided' : 'charged',
            ticket.totalCents,
            ticket.chargedAt,
            [],
            ticket.userId,
            null,
          ),
      );
    const charged = all.filter((ticket) => ticket.isCharged());
    return new TicketsPage(
      items,
      all.length,
      new SalesSummary(charged.length, charged.reduce((sum, t) => sum + t.totalCents, 0), [], [], []),
    );
  }

  all(): Ticket[] {
    return [...this.ticketsById.values()];
  }
}

export class ProductCatalogForTesting implements ProductCatalog {
  private readonly products = new Map<string, ForSaleProduct>();

  addProduct(product: ForSaleProduct): void {
    this.products.set(product.id, product);
  }

  async findForSale(productId: string): Promise<Nullable<ForSaleProduct>> {
    return this.products.get(productId) ?? null;
  }
}

export class StockDiscounterForTesting implements StockDiscounter {
  readonly discounts: Array<{ ticketId: string; items: SaleStockItem[]; userId: string }> = [];
  readonly reversals: string[] = [];
  readonly refundReturns: Array<{ ticketId: string; refundId: string; items: SaleStockItem[] }> = [];

  async discountForSale(ticketId: string, items: SaleStockItem[], userId: string): Promise<void> {
    this.discounts.push({ ticketId, items, userId });
  }

  async reverseSale(ticketId: string): Promise<void> {
    this.reversals.push(ticketId);
  }

  async returnForRefund(ticketId: string, refundId: string, items: SaleStockItem[]): Promise<void> {
    this.refundReturns.push({ ticketId, refundId, items });
  }
}

export class ReceiptPrinterForTesting implements ReceiptPrinter {
  readonly printed: Ticket[] = [];
  readonly refundReceipts: Refund[] = [];
  private result: PrintReceiptResult = new ReceiptPrinted();

  failWith(result: PrintReceiptResult): void {
    this.result = result;
  }

  async printSaleReceipt(ticket: Ticket): Promise<PrintReceiptResult> {
    this.printed.push(ticket);
    return this.result;
  }

  async printRefundReceipt(_ticket: Ticket, refund: Refund): Promise<PrintReceiptResult> {
    this.refundReceipts.push(refund);
    return this.result;
  }

  async printTestPage(): Promise<PrintReceiptResult> {
    return this.result;
  }
}

export class CashDrawerForTesting implements CashDrawer {
  openedTimes = 0;

  async open(): Promise<void> {
    this.openedTimes += 1;
  }
}

export class CreditGatewayForTesting implements CreditGateway {
  readonly charges: Array<{ customerId: string; amountCents: number; ticketId: string }> = [];
  readonly reversals: string[] = [];
  readonly creditRefunds: Array<{ ticketId: string; amountCents: number }> = [];
  private result: CreditChargeResult = new CreditAccepted();
  private creditRefundAccepted = true;

  declineWith(result: CreditChargeResult): void {
    this.result = result;
  }

  withoutCreditToRefund(): void {
    this.creditRefundAccepted = false;
  }

  async chargeCredit(customerId: string, amountCents: number, ticketId: string): Promise<CreditChargeResult> {
    this.charges.push({ customerId, amountCents, ticketId });
    return this.result;
  }

  async reverseCreditForTicket(ticketId: string): Promise<void> {
    this.reversals.push(ticketId);
  }

  async refundToCredit(ticketId: string, amountCents: number): Promise<boolean> {
    if (!this.creditRefundAccepted) return false;
    this.creditRefunds.push({ ticketId, amountCents });
    return true;
  }
}

export class RefundRepositoryForTesting implements RefundRepository {
  private readonly refunds: Refund[] = [];

  async save(refund: Refund): Promise<void> {
    this.refunds.push(refund);
  }

  async findByTicketId(ticketId: string): Promise<Refund[]> {
    return this.refunds.filter((refund) => refund.ticketId === ticketId);
  }

  all(): Refund[] {
    return [...this.refunds];
  }
}

export class RefundCashForTesting implements RefundCash {
  readonly payouts: Array<{ amountCents: number; concept: string; userId: string }> = [];
  private result: RefundCashResult = new RefundCashPaid();

  rejectWith(humanMessage: string): void {
    this.result = new RefundCashRejected(humanMessage);
  }

  async payOutRefund(amountCents: number, concept: string, userId: string): Promise<RefundCashResult> {
    if (this.result instanceof RefundCashPaid) {
      this.payouts.push({ amountCents, concept, userId });
    }
    return this.result;
  }
}

export class CashSessionLookupForTesting implements CashSessionLookup {
  constructor(private sessionId: NullableSession<string> = 'session-1') {}

  closeSession(): void {
    this.sessionId = null;
  }

  async openSessionId(): Promise<NullableSession<string>> {
    return this.sessionId;
  }
}
