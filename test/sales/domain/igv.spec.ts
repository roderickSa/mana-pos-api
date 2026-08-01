import { IgvBreakdown, igvBreakdownOf } from '#modules/sales/domain/igv.js';

describe('igvBreakdownOf', () => {
  it('splits a tax-inclusive total into base and IGV', () => {
    const breakdown = igvBreakdownOf(11800, 18);

    expect(breakdown).toBeInstanceOf(IgvBreakdown);
    expect(breakdown.baseCents).toBe(10000);
    expect(breakdown.igvCents).toBe(1800);
  });

  it('base and IGV always add up to the total after rounding', () => {
    const breakdown = igvBreakdownOf(999, 18);

    expect(breakdown.baseCents + breakdown.igvCents).toBe(999);
    expect(breakdown.baseCents).toBe(847);
  });

  it('rate zero means everything is base (venta exonerada)', () => {
    const breakdown = igvBreakdownOf(5000, 0);

    expect(breakdown.baseCents).toBe(5000);
    expect(breakdown.igvCents).toBe(0);
  });
});
