import { fuzzyMatchesName, levenshtein } from '#modules/catalog/domain/fuzzy-match.js';

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('azucr', 'azucar')).toBe(1);
    expect(levenshtein('detergnte', 'detergente')).toBe(1);
    expect(levenshtein('pan', 'pan')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('fuzzyMatchesName', () => {
  it('tolerates typos within ⌊len/3⌋ per token', () => {
    expect(fuzzyMatchesName('azucar rubia cartavio 1 kg', 'azucr')).toBe(true);
    expect(fuzzyMatchesName('detergente bolivar floral', 'detergnte')).toBe(true);
    expect(fuzzyMatchesName('platano de seda', 'platano')).toBe(true);
  });

  it('matches typo-ed prefixes of longer words', () => {
    expect(fuzzyMatchesName('detergente bolivar', 'detergen')).toBe(true);
  });

  it('rejects distant words and requires every token', () => {
    expect(fuzzyMatchesName('azucar rubia', 'harina')).toBe(false);
    expect(fuzzyMatchesName('azucar rubia', 'azucr blanca')).toBe(false);
  });
});
