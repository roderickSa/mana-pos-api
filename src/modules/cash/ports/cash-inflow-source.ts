export class MethodTotal {
  constructor(
    readonly method: 'cash' | 'yape' | 'card' | 'credit',
    readonly amountCents: number,
  ) {}
}

// Entradas de dinero que ocurren fuera del módulo cash: ventas y abonos de fiado.
export interface CashInflowSource {
  // Efectivo de ventas cobradas (no anuladas) desde una fecha.
  cashFromSalesSince(from: Date): Promise<number>;
  // Abonos de fiado en efectivo desde una fecha.
  cashFromAbonosSince(from: Date): Promise<number>;
  // Desglose de ventas cobradas por método (para el corte).
  salesByMethodSince(from: Date): Promise<MethodTotal[]>;
}
