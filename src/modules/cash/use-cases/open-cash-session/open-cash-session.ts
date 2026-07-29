import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CashSession, type CashShift } from '#modules/cash/domain/cash-session.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';

export class OpenCashSessionInput {
  constructor(
    readonly shift: CashShift,
    readonly openingAmountCents: number,
    readonly userId: string,
  ) {}
}

export class SessionOpened {
  constructor(readonly session: CashSession) {}
}

export class SessionAlreadyOpen {
  constructor(readonly session: CashSession) {}
}

export type OpenCashSessionResult = SessionOpened | SessionAlreadyOpen;

export class OpenCashSession {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: OpenCashSessionInput): Promise<OpenCashSessionResult> {
    const open = await this.cashSessionRepository.findOpen();
    if (open !== null) {
      return new SessionAlreadyOpen(open);
    }
    const session = CashSession.open(
      this.idGenerator.generate(),
      input.shift,
      input.userId,
      input.openingAmountCents,
      this.timeManager.now(),
    );
    await this.cashSessionRepository.save(session);
    return new SessionOpened(session);
  }
}
