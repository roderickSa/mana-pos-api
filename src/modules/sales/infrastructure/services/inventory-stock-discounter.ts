import type { DiscountStockForSale } from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.js';
import {
  DiscountStockForSaleInput,
  SaleItem,
} from '#modules/inventory/use-cases/discount-stock-for-sale/discount-stock-for-sale.input.js';
import type { ReverseSaleStock } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.js';
import { ReverseSaleStockInput } from '#modules/inventory/use-cases/reverse-sale-stock/reverse-sale-stock.input.js';
import type { ReturnRefundStock } from '#modules/inventory/use-cases/return-refund-stock/return-refund-stock.js';
import {
  RefundItem,
  ReturnRefundStockInput,
} from '#modules/inventory/use-cases/return-refund-stock/return-refund-stock.input.js';
import type { SaleStockItem, StockDiscounter } from '#modules/sales/ports/stock-discounter.js';

// Adapter: delega en los use cases idempotentes del módulo inventory.
export class InventoryStockDiscounter implements StockDiscounter {
  constructor(
    private readonly discountStockForSale: DiscountStockForSale,
    private readonly reverseSaleStock: ReverseSaleStock,
    private readonly returnRefundStock: ReturnRefundStock,
  ) {}

  async discountForSale(ticketId: string, items: SaleStockItem[], userId: string): Promise<void> {
    await this.discountStockForSale.execute(
      new DiscountStockForSaleInput(
        ticketId,
        items.map((item) => new SaleItem(item.productId, item.quantity, item.valueCents)),
        userId,
      ),
    );
  }

  async reverseSale(ticketId: string, userId: string): Promise<void> {
    await this.reverseSaleStock.execute(new ReverseSaleStockInput(ticketId, userId));
  }

  async returnForRefund(
    ticketId: string,
    refundId: string,
    items: SaleStockItem[],
    userId: string,
  ): Promise<void> {
    await this.returnRefundStock.execute(
      new ReturnRefundStockInput(
        ticketId,
        refundId,
        items.map((item) => new RefundItem(item.productId, item.quantity, item.valueCents)),
        userId,
      ),
    );
  }
}
