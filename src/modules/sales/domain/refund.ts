// Devolución interna (sin nota de crédito SUNAT): el cliente regresa productos
// de una venta cobrada, el stock reingresa y el dinero sale de caja — o rebaja
// la deuda si la venta fue fiada.
export class RefundLine {
  constructor(
    readonly id: string,
    readonly ticketLineId: string,
    readonly productId: string,
    readonly description: string,
    // Unidades para productos por unidad, gramos para pesables.
    readonly quantity: number,
    readonly amountCents: number,
  ) {}
}

export class Refund {
  constructor(
    readonly id: string,
    readonly ticketId: string,
    readonly lines: RefundLine[],
    readonly reason: string,
    readonly registeredBy: string,
    // true cuando el dinero volvió como abono al fiado, no en efectivo.
    readonly refundedToCredit: boolean,
    // Lo que se paga por esta tanda. Las líneas guardan valores exactos al
    // céntimo; el redondeo a 10 céntimos se aplica UNA vez, sobre este total.
    readonly totalCents: number,
    readonly createdAt: Date,
  ) {}

  get linesTotalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.amountCents, 0);
  }
}
