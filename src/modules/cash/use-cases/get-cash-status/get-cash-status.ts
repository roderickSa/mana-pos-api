import type { Nullable } from '#shared/domain/nullable.js';
import {
  CashBreakdown,
  type CashMovement,
  type CashSession,
} from '#modules/cash/domain/cash-session.js';
import type { CashInflowSource } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';

export class OpenSessionStatus {
  constructor(
    readonly session: CashSession,
    readonly breakdown: CashBreakdown,
    readonly movements: CashMovement[],
  ) {}
}

export class NoOpenSession {
  constructor(readonly lastClosed: Nullable<CashSession>) {}
}

export type CashStatusResult = OpenSessionStatus | NoOpenSession;

export class GetCashStatus {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly cashInflowSource: CashInflowSource,
  ) {}

  async execute(): Promise<CashStatusResult> {
    const session = await this.cashSessionRepository.findOpen();
    if (session === null) {
      return new NoOpenSession(await this.cashSessionRepository.lastClosed());
    }
    const breakdown = await this.buildBreakdown(session);
    const movements = await this.cashSessionRepository.movementsOf(session.id);
    return new OpenSessionStatus(session, breakdown, movements);
  }

  async buildBreakdown(session: CashSession): Promise<CashBreakdown> {
    const [cashSales, cashAbonos, movements] = await Promise.all([
      this.cashInflowSource.cashFromSalesSince(session.openedAt),
      this.cashInflowSource.cashFromAbonosSince(session.openedAt),
      this.cashSessionRepository.movementsOf(session.id),
    ]);
    const withdrawals = movements
      .filter((movement) => movement.kind === 'withdrawal')
      .reduce((sum, movement) => sum + movement.amountCents, 0);
    const expenses = movements
      .filter((movement) => movement.kind === 'expense')
      .reduce((sum, movement) => sum + movement.amountCents, 0);
    return new CashBreakdown(session.openingAmountCents, cashSales, cashAbonos, withdrawals, expenses);
  }
}
