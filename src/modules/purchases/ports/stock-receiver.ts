import type { Nullable } from '#shared/domain/nullable.js';

// Entrega la mercadería recibida al inventario: kardex, stock, costo último
// y vencimiento del lote. Devuelve false si el producto ya no existe.
export interface StockReceiver {
  receivePurchase(
    productId: string,
    quantity: number,
    unitCostCents: number,
    expiryDate: Nullable<Date>,
    userId: string,
  ): Promise<boolean>;
}
