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
  ) {}

  async execute(input: LoginWithPinInput): Promise<LoginWithPinResult> {
    const activeUsers = (await this.userRepository.findAll()).filter((user) => user.active);
    for (const user of activeUsers) {
      if (this.pinHasher.verify(input.pin, user.pinHash)) {
        return new LoginSucceeded(user);
      }
    }
    return new InvalidPin();
  }
}
