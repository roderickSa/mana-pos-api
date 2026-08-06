// En Perú la moneda mínima real es de 10 céntimos: todo monto que se paga o
// cobra en físico se redondea a múltiplos de 10.
export function roundToDime(cents: number): number {
  return Math.round(cents / 10) * 10;
}

export function ceilToDime(cents: number): number {
  return Math.ceil(cents / 10) * 10;
}

export function floorToDime(cents: number): number {
  return Math.floor(cents / 10) * 10;
}
