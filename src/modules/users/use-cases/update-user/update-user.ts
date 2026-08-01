import type { Nullable } from '#shared/domain/nullable.js';
import { isWeakPin } from '#modules/users/domain/pin-policy.js';
import { User, type UserRole } from '#modules/users/domain/user.js';
import type { PinHasher } from '#modules/users/ports/pin-hasher.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';
import { PinAlreadyInUse, WeakPin } from '#modules/users/use-cases/create-user/create-user.js';

export class UpdateUserInput {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly role: UserRole,
    readonly active: boolean,
    // null = mantener el PIN actual.
    readonly newPin: Nullable<string>,
  ) {}
}

export class UserUpdated {
  constructor(readonly user: User) {}
}

export class UserNotFoundById {
  constructor(readonly userId: string) {}
}

export type UpdateUserResult = UserUpdated | UserNotFoundById | PinAlreadyInUse | WeakPin;

export class UpdateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserResult> {
    const existing = await this.userRepository.findById(input.id);
    if (existing === null) {
      return new UserNotFoundById(input.id);
    }

    let pinHash = existing.pinHash;
    if (input.newPin !== null) {
      if (isWeakPin(input.newPin)) {
        return new WeakPin();
      }
      const others = (await this.userRepository.findAll()).filter((user) => user.id !== input.id);
      const pinTaken = others.some(
        (user) => user.active && this.pinHasher.verify(input.newPin ?? '', user.pinHash),
      );
      if (pinTaken) {
        return new PinAlreadyInUse();
      }
      pinHash = this.pinHasher.hash(input.newPin);
    }

    const updated = new User(existing.id, input.name, pinHash, input.role, input.active, existing.createdAt);
    await this.userRepository.save(updated);
    return new UserUpdated(updated);
  }
}
