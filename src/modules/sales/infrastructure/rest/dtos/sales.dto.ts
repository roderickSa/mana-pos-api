import { z } from 'zod';

import type { Nullable } from '#shared/domain/nullable.js';
import { dimeCents } from '#shared/infrastructure/rest/money.dto.js';
import { CashPayment, CreditPayment, YapePayment } from '#modules/sales/domain/payment.js';
import type { Refund } from '#modules/sales/domain/refund.js';
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
          discountCents: dimeCents(z.number().int().min(0)).default(0),
        }),
        z.object({
          saleType: z.literal('weight'),
          productId: z.string().min(1),
          grams: z.number().int().positive(),
          weightSource: z.enum(['scale', 'manual']),
          discountCents: dimeCents(z.number().int().min(0)).default(0),
        }),
      ]),
    )
    .max(200),
  payments: z
    .array(
      z.discriminatedUnion('method', [
        z.object({
          method: z.literal('cash'),
          amountCents: dimeCents(z.number().int().positive()),
          receivedCents: dimeCents(z.number().int().positive()).nullish(),
        }),
        z.object({ method: z.literal('yape'), amountCents: dimeCents(z.number().int().positive()) }),
        z.object({ method: z.literal('card'), amountCents: dimeCents(z.number().int().positive()) }),
        z.object({
          method: z.literal('credit'),
          amountCents: dimeCents(z.number().int().positive()),
          customerId: z.string().min(1),
        }),
      ]),
    )
    .min(1)
    .max(4),
  userId: z.string().min(1).default('cajera'),
  ticketDiscountCents: dimeCents(z.number().int().min(0)).default(0),
  // Nombre del encargado que autorizó el descuento (PIN ya verificado en el front).
  discountAuthorizedBy: z.string().trim().min(1).nullish(),
  // Cliente opcional de la venta (no solo para fiado).
  customerId: z.string().min(1).nullish(),
});

export const salesSearchDto = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(['cash', 'yape', 'card', 'credit']).optional(),
  status: z.enum(['charged', 'voided']).optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

export const refundTicketDto = z.object({
  lines: z
    .array(
      z.object({
        ticketLineId: z.string().min(1),
        // Unidades o gramos según la línea original.
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(200),
  reason: z
    .string({ message: 'Indica el motivo de la devolución.' })
    .trim()
    .min(3, 'Indica el motivo de la devolución (mínimo 3 letras).')
    .max(200),
  registeredBy: z.string().min(1).default('encargado'),
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
    linesTotalCents: ticket.linesTotalCents,
    subtotalCents: ticket.subtotalCents,
    roundingCents: ticket.roundingCents,
    discountCents: ticket.discountCents,
    lineDiscountsCents: ticket.lineDiscountsCents,
    discountAuthorizedBy: ticket.discountAuthorizedBy,
    customerId: ticket.customerId,
    changeCents,
    userId: ticket.userId,
    createdAt: ticket.createdAt.toISOString(),
    chargedAt: ticket.chargedAt?.toISOString() ?? null,
    voidedAt: ticket.voidedAt?.toISOString() ?? null,
    voidedBy: ticket.voidedBy,
    voidReason: ticket.voidReason,
    lines: ticket.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line instanceof UnitTicketLine ? line.quantity : null,
      grams: line instanceof UnitTicketLine ? null : line.grams,
      unitPriceCents: line instanceof UnitTicketLine ? line.unitPriceCents : line.pricePerKgCents,
      discountCents: line.discountCents,
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

export function toRefundResponse(refund: Refund): Record<string, unknown> {
  return {
    id: refund.id,
    ticketId: refund.ticketId,
    reason: refund.reason,
    registeredBy: refund.registeredBy,
    refundedToCredit: refund.refundedToCredit,
    totalCents: refund.totalCents,
    createdAt: refund.createdAt.toISOString(),
    lines: refund.lines.map((line) => ({
      ticketLineId: line.ticketLineId,
      description: line.description,
      quantity: line.quantity,
      amountCents: line.amountCents,
    })),
  };
}
