export class ExpiringProduct {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly saleType: 'unit' | 'weight',
    readonly stockQuantity: number,
    readonly expiryDate: Date,
  ) {}

  daysLeft(reference: Date): number {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.ceil((this.expiryDate.getTime() - reference.getTime()) / dayMs);
  }
}
