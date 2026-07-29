import type { Nullable } from '#shared/domain/nullable.js';
import { InvalidTicketTransition } from '#modules/sales/domain/exceptions/invalid-ticket-transition.js';
import type { Payment } from '#modules/sales/domain/payment.js';
import type { TicketLine } from '#modules/sales/domain/ticket-line.js';
import {
  ChargedTicketStatus,
  OpenTicketStatus,
  VoidedTicketStatus,
  type TicketStatus,
} from '#modules/sales/domain/ticket-status.js';

export class Ticket {
  constructor(
    readonly id: string,
    readonly number: number,
    readonly status: TicketStatus,
    readonly lines: TicketLine[],
    readonly payments: Payment[],
    readonly userId: string,
    readonly cashSessionId: Nullable<string>,
    readonly createdAt: Date,
    readonly chargedAt: Nullable<Date>,
    readonly voidedAt: Nullable<Date>,
    readonly voidedBy: Nullable<string>,
  ) {}

  static open(
    id: string,
    number: number,
    lines: TicketLine[],
    userId: string,
    cashSessionId: Nullable<string>,
    at: Date,
  ): Ticket {
    return new Ticket(
      id,
      number,
      new OpenTicketStatus(),
      lines,
      [],
      userId,
      cashSessionId,
      at,
      null,
      null,
      null,
    );
  }

  get totalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.totalCents, 0);
  }

  charge(payments: Payment[], at: Date): Ticket {
    const next = new ChargedTicketStatus();
    this.assertTransition(next);
    return new Ticket(
      this.id,
      this.number,
      next,
      this.lines,
      payments,
      this.userId,
      this.cashSessionId,
      this.createdAt,
      at,
      null,
      null,
    );
  }

  void(at: Date, voidedBy: string): Ticket {
    const next = new VoidedTicketStatus();
    this.assertTransition(next);
    return new Ticket(
      this.id,
      this.number,
      next,
      this.lines,
      this.payments,
      this.userId,
      this.cashSessionId,
      this.createdAt,
      this.chargedAt,
      at,
      voidedBy,
    );
  }

  isCharged(): boolean {
    return this.status instanceof ChargedTicketStatus;
  }

  isVoided(): boolean {
    return this.status instanceof VoidedTicketStatus;
  }

  private assertTransition(next: TicketStatus): void {
    if (!this.status.canTransitionTo(next)) {
      throw new InvalidTicketTransition(this.status.name, next.name);
    }
  }
}
