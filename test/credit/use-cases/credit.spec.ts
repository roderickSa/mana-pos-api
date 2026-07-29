import { ChargeCredit } from '#modules/credit/use-cases/charge-credit/charge-credit.js';
import { ChargeCreditInput } from '#modules/credit/use-cases/charge-credit/charge-credit.input.js';
import {
  CreditAlreadyCharged,
  CreditCharged,
  CreditLimitExceeded,
  CustomerNotFoundForCredit,
} from '#modules/credit/use-cases/charge-credit/charge-credit.output.js';
import { RegisterAbono } from '#modules/credit/use-cases/register-abono/register-abono.js';
import { RegisterAbonoInput } from '#modules/credit/use-cases/register-abono/register-abono.input.js';
import {
  AbonoExceedsDebt,
  AbonoRegistered,
} from '#modules/credit/use-cases/register-abono/register-abono.output.js';
import {
  CreditAlreadyReversed,
  CreditReversed,
  NoCreditForTicket,
  ReverseCreditForTicket,
  ReverseCreditForTicketInput,
} from '#modules/credit/use-cases/reverse-credit-for-ticket/reverse-credit-for-ticket.js';
import {
  CreditLedgerForTesting,
  CustomerRepositoryForTesting,
  customerMother,
} from '../test-doubles/credit-test-doubles.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

describe('ChargeCredit', () => {
  let customers: CustomerRepositoryForTesting;
  let ledger: CreditLedgerForTesting;
  let useCase: ChargeCredit;

  beforeEach(async () => {
    customers = new CustomerRepositoryForTesting();
    ledger = new CreditLedgerForTesting();
    useCase = new ChargeCredit(customers, ledger, new IdGeneratorForTesting(), new TimeManagerForTesting());
    await customers.save(customerMother('cliente-1', 5000));
  });

  it('charges within the credit limit', async () => {
    const result = await useCase.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));

    expect(result).toBeInstanceOf(CreditCharged);
    expect(await ledger.balanceOf('cliente-1')).toBe(3000);
  });

  it('rejects charges beyond the limit', async () => {
    await useCase.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));

    const result = await useCase.execute(new ChargeCreditInput('cliente-1', 2500, 'ticket-2', 'cajera'));

    expect(result).toBeInstanceOf(CreditLimitExceeded);
    if (!(result instanceof CreditLimitExceeded)) return;
    expect(result.availableCents).toBe(2000);
    expect(await ledger.balanceOf('cliente-1')).toBe(3000);
  });

  it('is idempotent per ticket', async () => {
    await useCase.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));
    const replay = await useCase.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));

    expect(replay).toBeInstanceOf(CreditAlreadyCharged);
    expect(await ledger.balanceOf('cliente-1')).toBe(3000);
  });

  it('rejects unknown customers', async () => {
    const result = await useCase.execute(new ChargeCreditInput('fantasma', 100, 'ticket-9', 'cajera'));

    expect(result).toBeInstanceOf(CustomerNotFoundForCredit);
  });
});

describe('RegisterAbono', () => {
  it('lowers the debt and rejects overpayments', async () => {
    const customers = new CustomerRepositoryForTesting();
    const ledger = new CreditLedgerForTesting();
    await customers.save(customerMother('cliente-1', 5000));
    const chargeCredit = new ChargeCredit(customers, ledger, new IdGeneratorForTesting(), new TimeManagerForTesting());
    await chargeCredit.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));
    const useCase = new RegisterAbono(customers, ledger, new IdGeneratorForTesting(), new TimeManagerForTesting());

    const abono = await useCase.execute(new RegisterAbonoInput('cliente-1', 1000, 'cash', 'encargado'));
    expect(abono).toBeInstanceOf(AbonoRegistered);
    if (!(abono instanceof AbonoRegistered)) return;
    expect(abono.newBalanceCents).toBe(2000);

    const excesivo = await useCase.execute(new RegisterAbonoInput('cliente-1', 9000, 'cash', 'encargado'));
    expect(excesivo).toBeInstanceOf(AbonoExceedsDebt);
  });
});

describe('ReverseCreditForTicket', () => {
  it('reverses a ticket charge once', async () => {
    const customers = new CustomerRepositoryForTesting();
    const ledger = new CreditLedgerForTesting();
    await customers.save(customerMother('cliente-1', 5000));
    const chargeCredit = new ChargeCredit(customers, ledger, new IdGeneratorForTesting(), new TimeManagerForTesting());
    await chargeCredit.execute(new ChargeCreditInput('cliente-1', 3000, 'ticket-1', 'cajera'));
    const useCase = new ReverseCreditForTicket(ledger, new IdGeneratorForTesting(), new TimeManagerForTesting());

    const first = await useCase.execute(new ReverseCreditForTicketInput('ticket-1', 'encargado'));
    expect(first).toBeInstanceOf(CreditReversed);
    expect(await ledger.balanceOf('cliente-1')).toBe(0);

    const replay = await useCase.execute(new ReverseCreditForTicketInput('ticket-1', 'encargado'));
    expect(replay).toBeInstanceOf(CreditAlreadyReversed);
    expect(await ledger.balanceOf('cliente-1')).toBe(0);

    const none = await useCase.execute(new ReverseCreditForTicketInput('ticket-x', 'encargado'));
    expect(none).toBeInstanceOf(NoCreditForTicket);
  });
});
