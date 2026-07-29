import type { User } from '#modules/users/domain/user.js';
import type { PinHasher } from '#modules/users/ports/pin-hasher.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class VerifyManagerPinInput {
  constructor(readonly pin: string) {}
}

export class ManagerPinVerified {
  constructor(readonly manager: User) {}
}

export class NotAManagerPin {}

export type VerifyManagerPinResult = ManagerPinVerified | NotAManagerPin;

// Autoriza acciones sensibles (anular, etc.): el PIN debe ser de un encargado activo.
export class VerifyManagerPin {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(input: VerifyManagerPinInput): Promise<VerifyManagerPinResult> {
    const managers = (await this.userRepository.findAll()).filter(
      (user) => user.active && user.isManager(),
    );
    for (const manager of managers) {
      if (this.pinHasher.verify(input.pin, manager.pinHash)) {
        return new ManagerPinVerified(manager);
      }
    }
    return new NotAManagerPin();
  }
}
