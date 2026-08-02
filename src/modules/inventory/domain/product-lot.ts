// Un lote: lo que llegó en UNA entrada con su propia fecha de vencimiento.
// El stock del producto sigue siendo un contador único (las ventas no tocan
// lotes); los lotes son la memoria de qué parte del stock vence cuándo.
export class ProductLot {
  constructor(
    readonly id: string,
    readonly productId: string,
    // Unidades o gramos según el tipo de venta del producto.
    readonly quantity: number,
    readonly expiryDate: Date,
    readonly createdAt: Date,
  ) {}

  withQuantity(quantity: number): ProductLot {
    return new ProductLot(this.id, this.productId, quantity, this.expiryDate, this.createdAt);
  }

  withExpiry(expiryDate: Date): ProductLot {
    return new ProductLot(this.id, this.productId, this.quantity, expiryDate, this.createdAt);
  }
}

export class ProductLotGroup {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly currentStock: number,
    readonly lots: ProductLot[],
  ) {}
}

export class LotRemaining {
  constructor(
    readonly lot: ProductLot,
    readonly remaining: number,
  ) {}
}

// Rotación asumida: lo que vence primero se vende primero. Lo ya consumido
// (suma de lotes menos stock actual) se descuenta empezando por el lote más
// próximo a vencer. El stock sin lote (entradas sin fecha) no resta lotes.
export function remainingPerLot(group: ProductLotGroup): LotRemaining[] {
  const ordered = [...group.lots].sort(
    (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
  );
  const totalLotted = ordered.reduce((sum, lot) => sum + lot.quantity, 0);
  let consumed = Math.max(0, totalLotted - group.currentStock);
  return ordered.map((lot) => {
    const eaten = Math.min(lot.quantity, consumed);
    consumed -= eaten;
    return new LotRemaining(lot, lot.quantity - eaten);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Vista para la alerta: un lote con lo que le queda tras la rotación.
export class ExpiringLot {
  constructor(
    readonly lotId: string,
    readonly productId: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly remainingQuantity: number,
    readonly expiryDate: Date,
    readonly receivedAt: Date,
  ) {}

  daysLeft(reference: Date): number {
    return Math.ceil((this.expiryDate.getTime() - reference.getTime()) / DAY_MS);
  }
}
