import { unitCostFromPack } from '#modules/catalog/domain/pack-pricing.js';

describe('unitCostFromPack', () => {
  it('divides the pack cost by the pack size', () => {
    expect(unitCostFromPack(2400, 12)).toBe(200);
  });

  it('rounds to the nearest cent', () => {
    expect(unitCostFromPack(1000, 3)).toBe(333);
    expect(unitCostFromPack(500, 3)).toBe(167);
  });

  it('a pack of one costs the same as the unit', () => {
    expect(unitCostFromPack(750, 1)).toBe(750);
  });
});
