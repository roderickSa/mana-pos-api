export type WeightSource = 'scale' | 'manual';

export class UnitTicketLine {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly description: string,
    readonly quantity: number,
    readonly unitPriceCents: number,
  ) {}

  get totalCents(): number {
    return this.quantity * this.unitPriceCents;
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
  ) {}

  get totalCents(): number {
    return Math.round((this.grams / 1000) * this.pricePerKgCents);
  }
}

export type TicketLine = UnitTicketLine | WeightTicketLine;
