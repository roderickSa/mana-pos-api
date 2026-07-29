export class SaleItem {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    // Total de la línea vendida, en céntimos (precio real cobrado).
    readonly valueCents: number,
  ) {}
}

export class DiscountStockForSaleInput {
  constructor(
    readonly ticketId: string,
    readonly items: SaleItem[],
    readonly userId: string,
  ) {}
}
