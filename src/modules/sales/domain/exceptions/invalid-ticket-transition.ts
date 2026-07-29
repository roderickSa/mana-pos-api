export class InvalidTicketTransition extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`Invalid ticket transition from ${from} to ${to}`);
  }
}
