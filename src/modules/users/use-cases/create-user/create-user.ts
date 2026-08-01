import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { isWeakPin } from '#modules/users/domain/pin-policy.js';
import { User, type UserRole } from '#modules/users/domain/user.js';
import type { PinHasher } from '#modules/users/ports/pin-hasher.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

export class CreateUserInput {
  constructor(
    readonly name: string,
    readonly pin: string,
    readonly role: UserRole,
  ) {}
}

export class UserCreated {
  constructor(readonly user: User) {}
}

// El PIN identifica a la persona, así que debe ser único entre usuarios activos.
export class PinAlreadyInUse {}

export class WeakPin {}

export type CreateUserResult = UserCreated | PinAlreadyInUse | WeakPin;

export class CreateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pinHasher: PinHasher,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserResult> {
    if (isWeakPin(input.pin)) {
      return new WeakPin();
    }
    const existing = await this.userRepository.findAll();
    const pinTaken = existing.some(
      (user) => user.active && this.pinHasher.verify(input.pin, user.pinHash),
    );
    if (pinTaken) {
      return new PinAlreadyInUse();
    }

    const user = new User(
      this.idGenerator.generate(),
      input.name,
      this.pinHasher.hash(input.pin),
      input.role,
      true,
      this.timeManager.now(),
    );
    await this.userRepository.save(user);
    return new UserCreated(user);
  }
}
