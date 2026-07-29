export class SetStockCountInput {
  constructor(
    readonly productId: string,
    readonly countedQuantity: number,
    readonly userId: string,
  ) {}
}
