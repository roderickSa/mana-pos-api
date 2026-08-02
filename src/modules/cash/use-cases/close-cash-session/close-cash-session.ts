import type { Nullable } from '#shared/domain/nullable.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import type { CashBreakdown, CashSession } from '#modules/cash/domain/cash-session.js';
import type { CashInflowSource, MethodTotal } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';

export class CloseCashSessionInput {
  constructor(
    readonly countedCashCents: number,
    readonly userId: string,
    readonly note: Nullable<string>,
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

// El conteo no cuadró y no vino explicación: un descuadre sin nota es un
// hueco en la auditoría de caja.
export class ClosingNoteRequired {
  constructor(readonly differenceCents: number) {}
}

export type CloseCashSessionResult = SessionClosed | NoSessionToClose | ClosingNoteRequired;

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
    const difference = input.countedCashCents - breakdown.currentCashCents;
    const note = input.note === null || input.note.trim() === '' ? null : input.note.trim();
    if (difference !== 0 && note === null) {
      return new ClosingNoteRequired(difference);
    }
    const closed = session.close(
      breakdown.currentCashCents,
      input.countedCashCents,
      input.userId,
      this.timeManager.now(),
      note,
    );
    await this.cashSessionRepository.save(closed);
    const salesByMethod = await this.cashInflowSource.salesByMethodSince(session.openedAt);
    return new SessionClosed(closed, breakdown, salesByMethod);
  }
}
