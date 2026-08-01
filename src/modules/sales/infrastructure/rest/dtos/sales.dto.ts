import { z } from 'zod';

import type { Nullable } from '#shared/domain/nullable.js';
import { CashPayment, CreditPayment, YapePayment } from '#modules/sales/domain/payment.js';
import type { Ticket } from '#modules/sales/domain/ticket.js';
import { UnitTicketLine } from '#modules/sales/domain/ticket-line.js';

export const checkoutDto = z.object({
  ticketId: z.string().uuid(),
  lines: z
    .array(
      z.discriminatedUnion('saleType', [
        z.object({
          saleType: z.literal('unit'),
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
        z.object({
          saleType: z.literal('weight'),
          productId: z.string().min(1),
          grams: z.number().int().positive(),
          weightSource: z.enum(['scale', 'manual']),
        }),
      ]),
    )
    .max(200),
  payments: z
    .array(
      z.discriminatedUnion('method', [
        z.object({
          method: z.literal('cash'),
          amountCents: z.number().int().positive(),
          receivedCents: z.number().int().positive().nullish(),
        }),
        z.object({ method: z.literal('yape'), amountCents: z.number().int().positive() }),
        z.object({ method: z.literal('card'), amountCents: z.number().int().positive() }),
        z.object({
          method: z.literal('credit'),
          amountCents: z.number().int().positive(),
          customerId: z.string().min(1),
        }),
      ]),
    )
    .min(1)
    .max(4),
  userId: z.string().min(1).default('cajera'),
});

export const salesSearchDto = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(['cash', 'yape', 'card', 'credit']).optional(),
  status: z.enum(['charged', 'voided']).optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const voidTicketDto = z.object({
  voidedBy: z.string().min(1).default('encargado'),
  // El motivo es obligatorio: la anulación es auditable y debe explicarse.
  reason: z
    .string({ message: 'Indica el motivo de la anulación.' })
    .trim()
    .min(3, 'Indica el motivo de la anulación (mínimo 3 letras).')
    .max(200),
});

export function toTicketResponse(ticket: Ticket, changeCents: Nullable<number>): Record<string, unknown> {
  return {
    id: ticket.id,
    number: ticket.number,
    status: ticket.status.name,
    totalCents: ticket.totalCents,
    changeCents,
    userId: ticket.userId,
    createdAt: ticket.createdAt.toISOString(),
    chargedAt: ticket.chargedAt?.toISOString() ?? null,
    voidedAt: ticket.voidedAt?.toISOString() ?? null,
    voidedBy: ticket.voidedBy,
    voidReason: ticket.voidReason,
    lines: ticket.lines.map((line) => ({
      description: line.description,
      quantity: line instanceof UnitTicketLine ? line.quantity : null,
      grams: line instanceof UnitTicketLine ? null : line.grams,
      unitPriceCents: line instanceof UnitTicketLine ? line.unitPriceCents : line.pricePerKgCents,
      totalCents: line.totalCents,
    })),
    payments: ticket.payments.map((payment) => ({
      method:
        payment instanceof CashPayment
          ? 'cash'
          : payment instanceof YapePayment
            ? 'yape'
            : payment instanceof CreditPayment
              ? 'credit'
              : 'card',
      amountCents: payment.amountCents,
    })),
  };
}
