import type { Nullable } from '#shared/domain/nullable.js';

export class VoidTicketInput {
  constructor(
    readonly ticketId: string,
    readonly voidedBy: string,
    readonly reason: Nullable<string>,
  ) {}
}
