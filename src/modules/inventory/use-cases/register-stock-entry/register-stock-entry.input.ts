import type { Nullable } from '#shared/domain/nullable.js';

export class RegisterStockEntryInput {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    readonly userId: string,
    // Costo unitario real de esta compra (por unidad o por kg), si se capturó.
    readonly unitCostCents: Nullable<number>,
    // Vencimiento del lote que llegó, si se capturó.
    readonly expiryDate: Nullable<Date>,
  ) {}
}
