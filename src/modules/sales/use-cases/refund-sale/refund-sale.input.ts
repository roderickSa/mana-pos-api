export class RefundLineOrder {
  constructor(
    readonly ticketLineId: string,
    // Unidades o gramos según el tipo de la línea original.
    readonly quantity: number,
  ) {}
}

export class RefundSaleInput {
  constructor(
    readonly ticketId: string,
    readonly lines: RefundLineOrder[],
    // Obligatorio: toda devolución se explica, igual que una anulación.
    readonly reason: string,
    readonly registeredBy: string,
  ) {}
}
