export class RegisterAbonoInput {
  constructor(
    readonly customerId: string,
    readonly amountCents: number,
    readonly paymentMethod: 'cash' | 'yape',
    readonly userId: string,
  ) {}
}
