import { roundToDime } from '#shared/domain/dime.js';
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
    // Descuento sobre el ticket completo, aparte de los descuentos por línea.
    readonly discountCents: number,
    readonly discountAuthorizedBy: Nullable<string>,
    // Cliente opcional: cualquier venta puede quedar a nombre de alguien.
    readonly customerId: Nullable<string>,
    readonly userId: string,
    readonly cashSessionId: Nullable<string>,
    readonly createdAt: Date,
    readonly chargedAt: Nullable<Date>,
    readonly voidedAt: Nullable<Date>,
    readonly voidedBy: Nullable<string>,
    readonly voidReason: Nullable<string>,
  ) {}

  static open(
    id: string,
    number: number,
    lines: TicketLine[],
    discountCents: number,
    discountAuthorizedBy: Nullable<string>,
    customerId: Nullable<string>,
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
      discountCents,
      discountAuthorizedBy,
      customerId,
      userId,
      cashSessionId,
      at,
      null,
      null,
      null,
      null,
    );
  }

  get linesTotalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.totalCents, 0);
  }

  // Suma exacta al céntimo, antes del redondeo de caja.
  get subtotalCents(): number {
    return this.linesTotalCents - this.discountCents;
  }

  // El redondeo a 10 céntimos se aplica UNA sola vez, aquí, sobre el total —
  // nunca por línea (acumularía pérdida). Es lo que el cliente paga.
  get totalCents(): number {
    return roundToDime(this.subtotalCents);
  }

  // Ajuste por redondeo (positivo o negativo); se muestra en voucher y detalle.
  get roundingCents(): number {
    return this.totalCents - this.subtotalCents;
  }

  get lineDiscountsCents(): number {
    return this.lines.reduce((sum, line) => sum + line.discountCents, 0);
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
      this.discountCents,
      this.discountAuthorizedBy,
      this.customerId,
      this.userId,
      this.cashSessionId,
      this.createdAt,
      at,
      null,
      null,
      null,
    );
  }

  void(at: Date, voidedBy: string, reason: Nullable<string>): Ticket {
    const next = new VoidedTicketStatus();
    this.assertTransition(next);
    return new Ticket(
      this.id,
      this.number,
      next,
      this.lines,
      this.payments,
      this.discountCents,
      this.discountAuthorizedBy,
      this.customerId,
      this.userId,
      this.cashSessionId,
      this.createdAt,
      this.chargedAt,
      at,
      voidedBy,
      reason,
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
