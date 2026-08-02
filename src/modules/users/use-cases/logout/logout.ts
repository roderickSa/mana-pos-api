import type { TimeManager } from '#shared/ports/time-manager.js';
import type { SessionRepository } from '#modules/users/ports/session-repository.js';

export class LogoutInput {
  constructor(readonly token: string) {}
}

export class LoggedOut {}

export class SessionNotFound {}

export type LogoutResult = LoggedOut | SessionNotFound;

// Revoca la sesión del token. Idempotente: cerrar una sesión ya revocada
// también es LoggedOut — al front solo le importa que quede muerta.
export class Logout {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutResult> {
    const session = await this.sessionRepository.findByToken(input.token);
    if (session === null) {
      return new SessionNotFound();
    }
    if (session.revokedAt === null) {
      await this.sessionRepository.save(session.revokedNow(this.timeManager.now()));
    }
    return new LoggedOut();
  }
}
