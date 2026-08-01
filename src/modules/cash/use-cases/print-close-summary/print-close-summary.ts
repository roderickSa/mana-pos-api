import type { Nullable } from '#shared/domain/nullable.js';
import type { CashInflowSource } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import { CloseSummary, type CloseSummaryPrinter } from '#modules/cash/ports/close-summary-printer.js';
import type { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';

export class CloseSummaryPrinted {
  constructor(readonly printerWarning: Nullable<string>) {}
}

export class NoClosedSessionToPrint {}

// Con una caja nueva abierta, los totales del cierre anterior ya no se pueden
// reconstruir con precisión: se imprime al cerrar, no días después.
export class SessionAlreadyReopened {}

export type PrintCloseSummaryResult =
  | CloseSummaryPrinted
  | NoClosedSessionToPrint
  | SessionAlreadyReopened;

export class PrintCloseSummary {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly getCashStatus: GetCashStatus,
    private readonly cashInflowSource: CashInflowSource,
    private readonly closeSummaryPrinter: CloseSummaryPrinter,
  ) {}

  async execute(): Promise<PrintCloseSummaryResult> {
    const open = await this.cashSessionRepository.findOpen();
    if (open !== null) {
      return new SessionAlreadyReopened();
    }
    const session = await this.cashSessionRepository.lastClosed();
    if (session === null) {
      return new NoClosedSessionToPrint();
    }
    const breakdown = await this.getCashStatus.buildBreakdown(session);
    const salesByMethod = await this.cashInflowSource.salesByMethodSince(session.openedAt);
    const warning = await this.closeSummaryPrinter.printCloseSummary(
      new CloseSummary(session, breakdown, salesByMethod),
    );
    return new CloseSummaryPrinted(warning);
  }
}
