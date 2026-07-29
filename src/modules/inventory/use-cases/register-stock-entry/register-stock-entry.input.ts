export class RegisterStockEntryInput {
  constructor(
    readonly productId: string,
    readonly quantity: number,
    readonly userId: string,
  ) {}
}
