export type WeightSource = 'scale' | 'manual';

export class UnitTicketLine {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly description: string,
    readonly quantity: number,
    readonly unitPriceCents: number,
    readonly discountCents: number,
  ) {}

  get grossCents(): number {
    return this.quantity * this.unitPriceCents;
  }

  get totalCents(): number {
    return this.grossCents - this.discountCents;
  }
}

export class WeightTicketLine {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly description: string,
    readonly grams: number,
    readonly pricePerKgCents: number,
    readonly weightSource: WeightSource,
    readonly discountCents: number,
  ) {}

  // La línea se calcula EXACTA al céntimo; el redondeo a 10 céntimos se aplica
  // una sola vez sobre el total del ticket (redondear por línea pierde plata).
  get grossCents(): number {
    return Math.round((this.grams / 1000) * this.pricePerKgCents);
  }

  get totalCents(): number {
    return this.grossCents - this.discountCents;
  }
}

export type TicketLine = UnitTicketLine | WeightTicketLine;
