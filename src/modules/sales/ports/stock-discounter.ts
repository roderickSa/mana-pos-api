export class SaleStockItem {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    // Total de la línea en céntimos (para valorizar el kardex).
    readonly valueCents: number,
  ) {}
}

export interface StockDiscounter {
  // Idempotente por ticketId: un replay no descuenta dos veces.
  discountForSale(ticketId: string, items: SaleStockItem[], userId: string): Promise<void>;
  // Idempotente: si la venta ya fue revertida, no vuelve a sumar stock.
  reverseSale(ticketId: string, userId: string): Promise<void>;
}
