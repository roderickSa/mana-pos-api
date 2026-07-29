export class VoidTicketInput {
  constructor(
    readonly ticketId: string,
    readonly voidedBy: string,
  ) {}
}
