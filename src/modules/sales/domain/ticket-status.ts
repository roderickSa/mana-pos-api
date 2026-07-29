export class OpenTicketStatus {
  readonly name: 'open' = 'open';

  canTransitionTo(next: TicketStatus): boolean {
    return next instanceof ChargedTicketStatus;
  }
}

export class ChargedTicketStatus {
  readonly name: 'charged' = 'charged';

  canTransitionTo(next: TicketStatus): boolean {
    return next instanceof VoidedTicketStatus;
  }
}

export class VoidedTicketStatus {
  readonly name: 'voided' = 'voided';

  canTransitionTo(_next: TicketStatus): boolean {
    return false;
  }
}

export type TicketStatus = OpenTicketStatus | ChargedTicketStatus | VoidedTicketStatus;
