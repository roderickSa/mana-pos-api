import { PrinterUnavailable } from '#modules/sales/ports/receipt-printer.js';
import {
  ReceiptReprinted,
  ReprintNotAllowed,
  ReprintReceipt,
  ReprintReceiptInput,
  TicketNotFoundForReprint,
} from '#modules/sales/use-cases/reprint-receipt/reprint-receipt.js';
import { chargedTicketMother } from '../mothers/ticket.mother.js';
import {
  ReceiptPrinterForTesting,
  RefundRepositoryForTesting,
  TicketRepositoryForTesting,
} from '../test-doubles/sales-test-doubles.js';

describe('ReprintReceipt', () => {
  let repository: TicketRepositoryForTesting;
  let printer: ReceiptPrinterForTesting;
  let useCase: ReprintReceipt;

  beforeEach(() => {
    repository = new TicketRepositoryForTesting();
    printer = new ReceiptPrinterForTesting();
    useCase = new ReprintReceipt(repository, new RefundRepositoryForTesting(), printer);
  });

  it('reprints a charged ticket', async () => {
    await repository.save(chargedTicketMother('ticket-1'));

    const result = await useCase.execute(new ReprintReceiptInput('ticket-1'));

    expect(result).toBeInstanceOf(ReceiptReprinted);
    if (!(result instanceof ReceiptReprinted)) return;
    expect(result.printerWarning).toBeNull();
    expect(printer.printed).toHaveLength(1);
  });

  it('propagates the human warning when the printer is down', async () => {
    await repository.save(chargedTicketMother('ticket-1'));
    printer.failWith(new PrinterUnavailable('La impresora no responde, revisa el cable USB'));

    const result = await useCase.execute(new ReprintReceiptInput('ticket-1'));

    expect(result).toBeInstanceOf(ReceiptReprinted);
    if (!(result instanceof ReceiptReprinted)) return;
    expect(result.printerWarning).toBe('La impresora no responde, revisa el cable USB');
  });

  it('rejects voided tickets and unknown ids', async () => {
    await repository.save(chargedTicketMother('ticket-1').void(new Date(), 'encargado', 'prueba'));

    const voided = await useCase.execute(new ReprintReceiptInput('ticket-1'));
    const missing = await useCase.execute(new ReprintReceiptInput('nope'));

    expect(voided).toBeInstanceOf(ReprintNotAllowed);
    expect(missing).toBeInstanceOf(TicketNotFoundForReprint);
    expect(printer.printed).toHaveLength(0);
  });
});
