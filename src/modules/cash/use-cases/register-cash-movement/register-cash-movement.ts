import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { CashMovement } from '#modules/cash/domain/cash-session.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import { GetCashStatus } from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';

export class RegisterCashMovementInput {
  constructor(
    readonly kind: 'withdrawal' | 'expense' | 'deposit',
    readonly amountCents: number,
    readonly concept: string,
    readonly userId: string,
  ) {}
}

export class CashMovementRegistered {
  constructor(
    readonly movement: CashMovement,
    readonly currentCashCents: number,
  ) {}
}

export class NoSessionForMovement {}

export class MovementExceedsCash {
  constructor(readonly currentCashCents: number) {}
}

export type RegisterCashMovementResult =
  | CashMovementRegistered
  | NoSessionForMovement
  | MovementExceedsCash;

export class RegisterCashMovement {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly getCashStatus: GetCashStatus,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: RegisterCashMovementInput): Promise<RegisterCashMovementResult> {
    const session = await this.cashSessionRepository.findOpen();
    if (session === null) {
      return new NoSessionForMovement();
    }

    const breakdown = await this.getCashStatus.buildBreakdown(session);
    if (input.kind !== 'deposit' && input.amountCents > breakdown.currentCashCents) {
      return new MovementExceedsCash(breakdown.currentCashCents);
    }

    const movement = new CashMovement(
      this.idGenerator.generate(),
      session.id,
      input.kind,
      input.amountCents,
      input.concept,
      input.userId,
      this.timeManager.now(),
    );
    await this.cashSessionRepository.appendMovement(movement);
    return new CashMovementRegistered(movement, breakdown.currentCashCents - input.amountCents);
  }
}
