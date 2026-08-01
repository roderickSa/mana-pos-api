import type { Nullable } from '#shared/domain/nullable.js';

export class ReceivePurchaseOrderLineInput {
  constructor(
    readonly lineId: string,
    // Unidades o gramos que llegaron de verdad (puede diferir de lo pedido).
    readonly quantity: number,
    // Costo real si difiere del pactado; null = usar el pactado de la línea.
    readonly unitCostCents: Nullable<number>,
    readonly expiryDate: Nullable<Date>,
  ) {}
}

export class ReceivePurchaseOrderInput {
  constructor(
    readonly orderId: string,
    readonly receivedBy: string,
    readonly lines: ReceivePurchaseOrderLineInput[],
  ) {}
}
