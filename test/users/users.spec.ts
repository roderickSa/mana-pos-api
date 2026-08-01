import type { Nullable } from '#shared/domain/nullable.js';
import { User } from '#modules/users/domain/user.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';
import { ScryptPinHasher } from '#modules/users/infrastructure/services/scrypt-pin-hasher.js';
import {
  CreateUser,
  CreateUserInput,
  PinAlreadyInUse,
  UserCreated,
  WeakPin,
} from '#modules/users/use-cases/create-user/create-user.js';
import {
  InvalidPin,
  LoginSucceeded,
  LoginWithPin,
  LoginWithPinInput,
} from '#modules/users/use-cases/login-with-pin/login-with-pin.js';
import {
  ManagerPinVerified,
  NotAManagerPin,
  VerifyManagerPin,
  VerifyManagerPinInput,
} from '#modules/users/use-cases/verify-manager-pin/verify-manager-pin.js';
import { IdGeneratorForTesting } from '../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../shared/test-doubles/time-manager-for-testing.js';

class UserRepositoryForTesting implements UserRepository {
  private readonly usersById = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.usersById.set(user.id, user);
  }

  async findById(id: string): Promise<Nullable<User>> {
    return this.usersById.get(id) ?? null;
  }

  async findAll(): Promise<User[]> {
    return [...this.usersById.values()];
  }

  async countUsers(): Promise<number> {
    return this.usersById.size;
  }
}

function build() {
  const repository = new UserRepositoryForTesting();
  const hasher = new ScryptPinHasher();
  const createUser = new CreateUser(repository, hasher, new IdGeneratorForTesting(), new TimeManagerForTesting());
  const login = new LoginWithPin(repository, hasher, new TimeManagerForTesting());
  const verifyManager = new VerifyManagerPin(repository, hasher);
  return { repository, createUser, login, verifyManager };
}

describe('Users & PIN', () => {
  it('logs in with the right PIN and rejects wrong ones', async () => {
    const { createUser, login } = build();
    await createUser.execute(new CreateUserInput('Rosa', '2468', 'cashier'));

    const ok = await login.execute(new LoginWithPinInput('2468'));
    const bad = await login.execute(new LoginWithPinInput('0000'));

    expect(ok).toBeInstanceOf(LoginSucceeded);
    if (!(ok instanceof LoginSucceeded)) return;
    expect(ok.user.name).toBe('Rosa');
    expect(bad).toBeInstanceOf(InvalidPin);
  });

  it('rejects duplicated PINs between active users', async () => {
    const { createUser } = build();
    await createUser.execute(new CreateUserInput('Rosa', '2468', 'cashier'));

    const duplicate = await createUser.execute(new CreateUserInput('Marta', '2468', 'cashier'));

    expect(duplicate).toBeInstanceOf(PinAlreadyInUse);
  });

  it('verifies manager PINs only', async () => {
    const { createUser, verifyManager } = build();
    await createUser.execute(new CreateUserInput('Rosa', '2468', 'cashier'));
    await createUser.execute(new CreateUserInput('Jefe', '9273', 'manager'));

    const cashierPin = await verifyManager.execute(new VerifyManagerPinInput('2468'));
    const managerPin = await verifyManager.execute(new VerifyManagerPinInput('9273'));

    expect(cashierPin).toBeInstanceOf(NotAManagerPin);
    expect(managerPin).toBeInstanceOf(ManagerPinVerified);
  });

  it('rejects weak PINs (repeated or sequential digits)', async () => {
    const { createUser } = build();

    expect(await createUser.execute(new CreateUserInput('Rosa', '9999', 'cashier'))).toBeInstanceOf(
      WeakPin,
    );
    expect(await createUser.execute(new CreateUserInput('Rosa', '1234', 'cashier'))).toBeInstanceOf(
      WeakPin,
    );
  });

  it('creates users with a hashed PIN (never plain text)', async () => {
    const { createUser } = build();

    const result = await createUser.execute(new CreateUserInput('Rosa', '2468', 'cashier'));

    expect(result).toBeInstanceOf(UserCreated);
    if (!(result instanceof UserCreated)) return;
    expect(result.user.pinHash).not.toContain('2468');
  });
});
