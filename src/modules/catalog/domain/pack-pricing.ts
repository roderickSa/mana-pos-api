// Costo unitario derivado de una compra por empaque: 1 caja/paquete/lote de
// packSize unidades comprada a packCostCents. Redondeo al céntimo más cercano.
export function unitCostFromPack(packCostCents: number, packSize: number): number {
  return Math.round(packCostCents / packSize);
}
