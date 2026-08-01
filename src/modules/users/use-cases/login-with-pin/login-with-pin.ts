import type { TimeManager } from '#shared/ports/time-manager.js';
import type { User } from '#modules/users/domain/user.js';
import type { PinHasher } from '#modules/users/ports/pin-hasher.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class LoginWithPinInput {
  constructor(readonly pin: string) {}
}

export class LoginSucceeded {
  constructor(readonly user: User) {}
}

export class InvalidPin {}

export type LoginWithPinResult = LoginSucceeded | InvalidPin;

// El PIN identifica a la persona: la cajera solo teclea su PIN, sin usuario.
export class LoginWithPin {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pinHasher: PinHasher,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: LoginWithPinInput): Promise<LoginWithPinResult> {
    const activeUsers = (await this.userRepository.findAll()).filter((user) => user.active);
    for (const user of activeUsers) {
      if (this.pinHasher.verify(input.pin, user.pinHash)) {
        const logged = user.withLastLogin(this.timeManager.now());
        await this.userRepository.save(logged);
        return new LoginSucceeded(logged);
      }
    }
    return new InvalidPin();
  }
}
