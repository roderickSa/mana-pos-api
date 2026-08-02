import type { Nullable } from '#shared/domain/nullable.js';

// Una tanda de recepción: qué llegó, cuándo, quién la recibió y a qué costo
// real. La orden guarda el acumulado; esto guarda la historia tanda a tanda.
export class PurchaseReceptionLine {
  constructor(
    readonly productId: string,
    // Unidades o gramos, según el tipo de venta del producto (como la orden).
    readonly quantity: number,
    readonly unitCostCents: number,
    readonly expiryDate: Nullable<Date>,
  ) {}
}

export class PurchaseReception {
  constructor(
    readonly id: string,
    readonly orderId: string,
    readonly receivedAt: Date,
    readonly receivedBy: string,
    readonly lines: PurchaseReceptionLine[],
  ) {}
}
