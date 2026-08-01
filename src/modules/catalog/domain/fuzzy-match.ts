// Tolerancia a typos: "azucr" debe encontrar "azucar". Distancia de
// Levenshtein con umbral ⌊len/3⌋ por token, sobre texto ya normalizado.

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

export function fuzzyMatchesName(normalizedName: string, normalizedQuery: string): boolean {
  const nameTokens = normalizedName.split(/\s+/).filter((token) => token !== '');
  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token !== '');
  if (queryTokens.length === 0) return false;

  return queryTokens.every((queryToken) => {
    const threshold = Math.floor(queryToken.length / 3);
    if (threshold === 0) return normalizedName.includes(queryToken);
    return nameTokens.some(
      (nameToken) =>
        nameToken.includes(queryToken) ||
        levenshtein(queryToken, nameToken) <= threshold ||
        (nameToken.length > queryToken.length &&
          levenshtein(queryToken, nameToken.slice(0, queryToken.length)) <= threshold),
    );
  });
}
