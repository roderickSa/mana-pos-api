import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { Session } from '#modules/users/domain/session.js';
import type { User } from '#modules/users/domain/user.js';
import type { PinHasher } from '#modules/users/ports/pin-hasher.js';
import type { SessionRepository } from '#modules/users/ports/session-repository.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class LoginWithPinInput {
  constructor(readonly pin: string) {}
}

export class LoginSucceeded {
  constructor(
    readonly user: User,
    readonly session: Session,
  ) {}
}

export class InvalidPin {}

export type LoginWithPinResult = LoginSucceeded | InvalidPin;

// El PIN identifica a la persona: la cajera solo teclea su PIN, sin usuario.
// El login abre una sesión con token opaco — el API deja de confiar en el
// front y valida ese token en cada request (middleware por rol).
export class LoginWithPin {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pinHasher: PinHasher,
    private readonly sessionRepository: SessionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: LoginWithPinInput): Promise<LoginWithPinResult> {
    const activeUsers = (await this.userRepository.findAll()).filter((user) => user.active);
    for (const user of activeUsers) {
      if (this.pinHasher.verify(input.pin, user.pinHash)) {
        const now = this.timeManager.now();
        const logged = user.withLastLogin(now);
        await this.userRepository.save(logged);
        // Dos ids concatenados: token opaco con entropía de sobra sin
        // agregar un puerto nuevo de aleatoriedad.
        const token = `${this.idGenerator.generate()}${this.idGenerator.generate()}`;
        const session = Session.startAt(token, logged.id, now);
        await this.sessionRepository.save(session);
        await this.sessionRepository.deleteExpiredBefore(now);
        return new LoginSucceeded(logged, session);
      }
    }
    return new InvalidPin();
  }
}
