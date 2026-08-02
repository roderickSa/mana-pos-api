import type { TimeManager } from '#shared/ports/time-manager.js';
import type { User } from '#modules/users/domain/user.js';
import type { SessionRepository } from '#modules/users/ports/session-repository.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class ValidateSessionInput {
  constructor(readonly token: string) {}
}

export class SessionValid {
  constructor(readonly user: User) {}
}

export class SessionInvalid {}

export type ValidateSessionResult = SessionValid | SessionInvalid;

// Valida el Bearer de cada request: sesión viva + usuario activo. De paso
// renueva la sesión cuando pasó media vida — el POS nunca corta un turno.
export class ValidateSession {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: ValidateSessionInput): Promise<ValidateSessionResult> {
    if (input.token === '') {
      return new SessionInvalid();
    }
    const session = await this.sessionRepository.findByToken(input.token);
    if (session === null) {
      return new SessionInvalid();
    }
    const now = this.timeManager.now();
    if (!session.isActiveAt(now)) {
      return new SessionInvalid();
    }
    const user = await this.userRepository.findById(session.userId);
    if (user === null || !user.active) {
      return new SessionInvalid();
    }
    if (session.needsRenewalAt(now)) {
      await this.sessionRepository.save(session.renewedAt(now));
    }
    return new SessionValid(user);
  }
}
