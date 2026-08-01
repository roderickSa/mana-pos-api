import { InvalidTicketTransition } from '#modules/sales/domain/exceptions/invalid-ticket-transition.js';
import { CashPayment } from '#modules/sales/domain/payment.js';
import { chargedTicketMother } from '../mothers/ticket.mother.js';

describe('Ticket state machine', () => {
  it('a charged ticket cannot be charged again', () => {
    const ticket = chargedTicketMother();

    expect(() => ticket.charge([new CashPayment(700)], new Date())).toThrow(InvalidTicketTransition);
  });

  it('a voided ticket cannot be voided again', () => {
    const voided = chargedTicketMother().void(new Date(), 'encargado', 'cliente se arrepintió');

    expect(() => voided.void(new Date(), 'encargado', null)).toThrow(InvalidTicketTransition);
  });

  it('computes the total from its lines', () => {
    expect(chargedTicketMother().totalCents).toBe(700);
  });
});
