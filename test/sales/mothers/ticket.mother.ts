import { CashPayment } from '#modules/sales/domain/payment.js';
import { Ticket } from '#modules/sales/domain/ticket.js';
import { UnitTicketLine } from '#modules/sales/domain/ticket-line.js';

export function chargedTicketMother(id = 'ticket-1'): Ticket {
  const open = Ticket.open(
    id,
    1,
    [new UnitTicketLine('line-1', 'gaseosa', 'Inca Kola 600 ml', 2, 350)],
    'cajera-rosa',
    'session-1',
    new Date('2026-07-29T10:00:00.000Z'),
  );
  return open.charge([new CashPayment(700)], new Date('2026-07-29T10:01:00.000Z'));
}
