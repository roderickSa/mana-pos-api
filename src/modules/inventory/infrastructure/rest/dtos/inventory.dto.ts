import { z } from 'zod';

import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';

// userId provisional hasta que exista el módulo users (tarea 8).
export const registerEntryDto = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  // Costo real de la compra (por unidad o por kg): opcional pero recomendado.
  unitCostCents: z.number().int().positive().nullish(),
  // Vencimiento del lote (YYYY-MM-DD), opcional.
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  userId: z.string().min(1).default('encargado'),
});

export const setExpiryDto = z.object({
  productId: z.string().min(1),
  // null limpia la fecha de vencimiento.
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export const registerAdjustmentDto = z.object({
  productId: z.string().min(1),
  kind: z.enum(['waste', 'expiry', 'theft']),
  quantity: z.number().int().positive(),
  reason: z.string().min(1).nullish(),
  userId: z.string().min(1).default('encargado'),
});

export const setCountDto = z.object({
  productId: z.string().min(1),
  countedQuantity: z.number().int().nonnegative(),
  userId: z.string().min(1).default('encargado'),
});

export const searchMovementsDto = z.object({
  query: z.string().optional(),
  kind: z
    .enum(['sale', 'sale_reversal', 'purchase', 'waste', 'expiry', 'theft', 'count'])
    .optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});

export function toMovementResponse(movement: StockMovement): Record<string, unknown> {
  return {
    id: movement.id,
    productId: movement.productId,
    kind: movement.kind,
    quantity: movement.quantity,
    valueCents: movement.valueCents,
    reason: movement.reason,
    ticketId: movement.ticketId,
    userId: movement.userId,
    createdAt: movement.createdAt.toISOString(),
  };
}
