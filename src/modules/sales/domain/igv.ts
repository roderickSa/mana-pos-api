// Desglose informativo de IGV sobre un total que YA incluye el impuesto:
// base = total / (1 + tasa), IGV = total - base. No altera ningún cobro.
export class IgvBreakdown {
  constructor(
    readonly ratePercent: number,
    readonly baseCents: number,
    readonly igvCents: number,
  ) {}
}

export function igvBreakdownOf(totalCents: number, ratePercent: number): IgvBreakdown {
  const baseCents = Math.round(totalCents / (1 + ratePercent / 100));
  return new IgvBreakdown(ratePercent, baseCents, totalCents - baseCents);
}
