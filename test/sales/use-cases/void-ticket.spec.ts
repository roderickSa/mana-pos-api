import { VoidTicket } from '#modules/sales/use-cases/void-ticket/void-ticket.js';
import { VoidTicketInput } from '#modules/sales/use-cases/void-ticket/void-ticket.input.js';
import {
  TicketAlreadyVoided,
  TicketNotFound,
  TicketVoided,
} from '#modules/sales/use-cases/void-ticket/void-ticket.output.js';
import { chargedTicketMother } from '../mothers/ticket.mother.js';
import {
  CreditGatewayForTesting,
  StockDiscounterForTesting,
  TicketRepositoryForTesting,
} from '../test-doubles/sales-test-doubles.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('VoidTicket', () => {
  let ticketRepository: TicketRepositoryForTesting;
  let stockDiscounter: StockDiscounterForTesting;
  let useCase: VoidTicket;

  beforeEach(() => {
    ticketRepository = new TicketRepositoryForTesting();
    stockDiscounter = new StockDiscounterForTesting();
    useCase = new VoidTicket(
      ticketRepository,
      stockDiscounter,
      new CreditGatewayForTesting(),
      new TimeManagerForTesting(),
    );
  });

  it('voids a charged ticket and reverses the stock', async () => {
    await ticketRepository.save(chargedTicketMother('ticket-1'));

    const result = await useCase.execute(new VoidTicketInput('ticket-1', 'encargado', 'producto vencido'));

    expect(result).toBeInstanceOf(TicketVoided);
    if (!(result instanceof TicketVoided)) return;
    expect(result.ticket.isVoided()).toBe(true);
    expect(result.ticket.voidedBy).toBe('encargado');
    expect(stockDiscounter.reversals).toEqual(['ticket-1']);
  });

  it('is replay-safe: voiding twice does not reverse stock twice', async () => {
    await ticketRepository.save(chargedTicketMother('ticket-1'));

    await useCase.execute(new VoidTicketInput('ticket-1', 'encargado', 'producto vencido'));
    const replay = await useCase.execute(new VoidTicketInput('ticket-1', 'encargado', 'producto vencido'));

    expect(replay).toBeInstanceOf(TicketAlreadyVoided);
    expect(stockDiscounter.reversals).toHaveLength(1);
  });

  it('returns TicketNotFound for unknown tickets', async () => {
    const result = await useCase.execute(new VoidTicketInput('nope', 'encargado', null));

    expect(result).toBeInstanceOf(TicketNotFound);
  });
});
