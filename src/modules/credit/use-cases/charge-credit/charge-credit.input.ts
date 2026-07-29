export class ChargeCreditInput {
  constructor(
    readonly customerId: string,
    readonly amountCents: number,
    readonly ticketId: string,
    readonly userId: string,
  ) {}
}
