export class ProductStock {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    readonly saleType: 'unit' | 'weight',
    // Costo por unidad (o por kg para productos por peso), en céntimos.
    readonly costCents: number,
  ) {}

  // Valor al costo de una cantidad (unidades o gramos según el tipo).
  costOf(quantity: number): number {
    return Math.round(
      this.saleType === 'unit' ? this.costCents * quantity : (this.costCents * quantity) / 1000,
    );
  }
}
