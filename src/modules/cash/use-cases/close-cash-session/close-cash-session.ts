import type { TimeManager } from '#shared/ports/time-manager.js';
import type { CashBreakdown, CashSession } from '#modules/cash/domain/cash-session.js';
import type { CashInflowSource, MethodTotal } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';

export class CloseCashSessionInput {
  constructor(
    readonly countedCashCents: number,
    readonly userId: string,
  ) {}
}

export class SessionClosed {
  constructor(
    readonly session: CashSession,
    readonly breakdown: CashBreakdown,
    readonly salesByMethod: MethodTotal[],
  ) {}

  get differenceCents(): number {
    return (this.session.countedCashCents ?? 0) - (this.session.expectedCashCents ?? 0);
  }
}

export class NoSessionToClose {}

export type CloseCashSessionResult = SessionClosed | NoSessionToClose;

export class CloseCashSession {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly cashInflowSource: CashInflowSource,
    private readonly getCashStatus: GetCashStatus,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CloseCashSessionInput): Promise<CloseCashSessionResult> {
    const session = await this.cashSessionRepository.findOpen();
    if (session === null) {
      return new NoSessionToClose();
    }

    const breakdown = await this.getCashStatus.buildBreakdown(session);
    const closed = session.close(
      breakdown.currentCashCents,
      input.countedCashCents,
      input.userId,
      this.timeManager.now(),
    );
    await this.cashSessionRepository.save(closed);
    const salesByMethod = await this.cashInflowSource.salesByMethodSince(session.openedAt);
    return new SessionClosed(closed, breakdown, salesByMethod);
  }
}
