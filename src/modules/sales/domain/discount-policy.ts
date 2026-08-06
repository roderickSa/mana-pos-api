import type { TicketLine } from '#modules/sales/domain/ticket-line.js';

// Política de descuentos: hasta este porcentaje de la línea, la cajera decide
// sola (redondeos y cortesías chicas). Más que eso — o cualquier descuento al
// ticket completo — lo autoriza el encargado con su PIN, igual que una anulación.
export const MAX_LINE_DISCOUNT_PERCENT_WITHOUT_MANAGER = 20;

export function discountsNeedManagerApproval(
  lines: TicketLine[],
  ticketDiscountCents: number,
): boolean {
  if (ticketDiscountCents > 0) {
    return true;
  }
  return lines.some(
    (line) => line.discountCents * 100 > line.grossCents * MAX_LINE_DISCOUNT_PERCENT_WITHOUT_MANAGER,
  );
}
