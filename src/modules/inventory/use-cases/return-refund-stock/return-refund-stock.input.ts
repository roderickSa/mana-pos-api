export class RefundItem {
  constructor(
    readonly productId: string,
    // Unidades o gramos según el tipo del producto.
    readonly quantity: number,
    // Lo devuelto al cliente por este producto, en céntimos.
    readonly valueCents: number,
  ) {}
}

export class ReturnRefundStockInput {
  constructor(
    readonly ticketId: string,
    // Una venta admite varias devoluciones: el id distingue cada tanda en el kardex.
    readonly refundId: string,
    readonly items: RefundItem[],
    readonly userId: string,
  ) {}
}
