import type { Nullable } from '#shared/domain/nullable.js';
import { UnitProduct, type Product } from '#modules/catalog/domain/product.js';

export { ceilToDime, roundToDime } from '#shared/domain/dime.js';

// Margen sobre el precio de venta: (precio − costo) / precio.
// null cuando no hay costo capturado (no se puede hablar de margen).
export function marginPercentOf(priceCents: number, costCents: number): Nullable<number> {
  if (priceCents <= 0 || costCents <= 0) {
    return null;
  }
  return ((priceCents - costCents) / priceCents) * 100;
}

export function priceCentsOf(product: Product): number {
  return product instanceof UnitProduct ? product.priceCents : product.pricePerKgCents;
}

export function costCentsOf(product: Product): number {
  return product instanceof UnitProduct ? product.costCents : product.costPerKgCents;
}

export class PriceChange {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly costCents: number,
    readonly oldPriceCents: number,
    readonly newPriceCents: number,
  ) {}

  get oldMarginPercent(): Nullable<number> {
    return marginPercentOf(this.oldPriceCents, this.costCents);
  }

  get newMarginPercent(): Nullable<number> {
    return marginPercentOf(this.newPriceCents, this.costCents);
  }
}
