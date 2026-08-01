import type { Nullable } from '#shared/domain/nullable.js';
import { CashMovement, CashSession } from '#modules/cash/domain/cash-session.js';
import { MethodTotal, type CashInflowSource } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import type { CloseSummary, CloseSummaryPrinter } from '#modules/cash/ports/close-summary-printer.js';
import { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';
import { OpenCashSession, OpenCashSessionInput } from '#modules/cash/use-cases/open-cash-session/open-cash-session.js';
import { CloseCashSession, CloseCashSessionInput } from '#modules/cash/use-cases/close-cash-session/close-cash-session.js';
import {
  CloseSummaryPrinted,
  NoClosedSessionToPrint,
  PrintCloseSummary,
  SessionAlreadyReopened,
} from '#modules/cash/use-cases/print-close-summary/print-close-summary.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

class CashSessionRepositoryForTesting implements CashSessionRepository {
  private readonly sessions = new Map<string, CashSession>();
  private readonly movements: CashMovement[] = [];

  async save(session: CashSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findOpen(): Promise<Nullable<CashSession>> {
    return [...this.sessions.values()].find((session) => session.isOpen()) ?? null;
  }

  async appendMovement(movement: CashMovement): Promise<void> {
    this.movements.push(movement);
  }

  async movementsOf(sessionId: string): Promise<CashMovement[]> {
    return this.movements.filter((movement) => movement.cashSessionId === sessionId);
  }

  async lastClosed(): Promise<Nullable<CashSession>> {
    return [...this.sessions.values()].find((session) => !session.isOpen()) ?? null;
  }
}

class CashInflowSourceForTesting implements CashInflowSource {
  cashSales = 0;

  async cashFromSalesSince(): Promise<number> {
    return this.cashSales;
  }

  async cashFromAbonosSince(): Promise<number> {
    return 0;
  }

  async salesByMethodSince(): Promise<MethodTotal[]> {
    return [new MethodTotal('cash', this.cashSales)];
  }
}

class CloseSummaryPrinterForTesting implements CloseSummaryPrinter {
  printed: CloseSummary[] = [];

  async printCloseSummary(summary: CloseSummary): Promise<Nullable<string>> {
    this.printed.push(summary);
    return null;
  }
}

function build() {
  const repository = new CashSessionRepositoryForTesting();
  const inflow = new CashInflowSourceForTesting();
  const timeManager = new TimeManagerForTesting();
  const status = new GetCashStatus(repository, inflow);
  const open = new OpenCashSession(repository, new IdGeneratorForTesting(), timeManager);
  const close = new CloseCashSession(repository, inflow, status, timeManager);
  const printer = new CloseSummaryPrinterForTesting();
  const print = new PrintCloseSummary(repository, status, inflow, printer);
  return { repository, inflow, open, close, printer, print };
}

describe('PrintCloseSummary', () => {
  it('prints the last closed session with its breakdown and totals', async () => {
    const { inflow, open, close, printer, print } = build();
    await open.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));
    inflow.cashSales = 10000;
    await close.execute(new CloseCashSessionInput(15000, 'encargado'));

    const result = await print.execute();

    expect(result).toBeInstanceOf(CloseSummaryPrinted);
    expect(printer.printed).toHaveLength(1);
    const summary = printer.printed[0];
    expect(summary?.breakdown.currentCashCents).toBe(15000);
    expect(summary?.differenceCents).toBe(0);
    expect(summary?.salesByMethod).toEqual([new MethodTotal('cash', 10000)]);
  });

  it('refuses when there is nothing closed to print', async () => {
    const { print } = build();
    expect(await print.execute()).toBeInstanceOf(NoClosedSessionToPrint);
  });

  it('refuses once a new session is open (totals no longer reconstructible)', async () => {
    const { inflow, open, close, print, printer } = build();
    await open.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));
    inflow.cashSales = 2000;
    await close.execute(new CloseCashSessionInput(7000, 'encargado'));
    await open.execute(new OpenCashSessionInput('afternoon', 3000, 'encargado'));

    expect(await print.execute()).toBeInstanceOf(SessionAlreadyReopened);
    expect(printer.printed).toHaveLength(0);
  });
});
