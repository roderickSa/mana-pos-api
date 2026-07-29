import type { Nullable } from '#shared/domain/nullable.js';

export type StockMovementKind =
  | 'sale'
  | 'sale_reversal'
  | 'purchase'
  | 'waste'
  | 'expiry'
  | 'theft'
  | 'count';

// quantity es un delta con signo: positivo suma stock, negativo lo descuenta.
// Unidades para productos por unidad, gramos para productos por peso.
// valueCents: valor del movimiento con el mismo signo que quantity — ventas al
// precio realmente vendido, el resto al costo del producto en ese momento.
export class StockMovement {
  constructor(
    readonly id: string,
    readonly productId: string,
    readonly kind: StockMovementKind,
    readonly quantity: number,
    readonly valueCents: Nullable<number>,
    readonly reason: Nullable<string>,
    readonly ticketId: Nullable<string>,
    readonly userId: string,
    readonly createdAt: Date,
  ) {}
}
