// Un PIN débil se adivina mirando: dígitos repetidos (0000, 111111) o
// secuencias corridas en cualquier dirección, con vuelta incluida (1234,
// 654321, 9012, 3210).
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) {
    return true;
  }
  const digits = [...pin].map((char) => Number(char));
  let ascending = true;
  let descending = true;
  for (let index = 1; index < digits.length; index += 1) {
    const previous = digits[index - 1] ?? 0;
    const current = digits[index] ?? 0;
    if (current !== (previous + 1) % 10) ascending = false;
    if (current !== (previous + 9) % 10) descending = false;
  }
  return ascending || descending;
}
