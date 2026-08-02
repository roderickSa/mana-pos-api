import { SESSION_TTL_MS, Session } from '#modules/users/domain/session.js';
import { User } from '#modules/users/domain/user.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';
import type { Nullable } from '#shared/domain/nullable.js';
import {
  SessionInvalid,
  SessionValid,
  ValidateSession,
  ValidateSessionInput,
} from '#modules/users/use-cases/validate-session/validate-session.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';
import { SessionRepositoryForTesting } from '../test-doubles/session-repository-for-testing.js';

const NOW = new Date('2026-08-02T10:00:00Z');

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

function build(nowAt: Date = NOW) {
  const sessions = new SessionRepositoryForTesting();
  const users = new UserRepositoryForTesting();
  const time = new TimeManagerForTesting(nowAt);
  return { sessions, users, validate: new ValidateSession(sessions, users, time) };
}

async function seedUser(users: UserRepositoryForTesting, active = true): Promise<User> {
  const user = new User('u1', 'Rosa', 'hash', 'cashier', active, NOW, null);
  await users.save(user);
  return user;
}

describe('ValidateSession', () => {
  it('accepts an active session of an active user', async () => {
    const { sessions, users, validate } = build();
    await seedUser(users);
    await sessions.save(Session.startAt('t1', 'u1', NOW));

    const result = await validate.execute(new ValidateSessionInput('t1'));

    expect(result).toBeInstanceOf(SessionValid);
    if (result instanceof SessionValid) {
      expect(result.user.name).toBe('Rosa');
    }
  });

  it('rejects empty, unknown, expired and revoked tokens', async () => {
    const { sessions, users, validate } = build();
    await seedUser(users);
    await sessions.save(
      Session.startAt('viejo', 'u1', new Date(NOW.getTime() - SESSION_TTL_MS - 1)),
    );
    await sessions.save(Session.startAt('revocado', 'u1', NOW).revokedNow(NOW));

    expect(await validate.execute(new ValidateSessionInput(''))).toBeInstanceOf(SessionInvalid);
    expect(await validate.execute(new ValidateSessionInput('nope'))).toBeInstanceOf(
      SessionInvalid,
    );
    expect(await validate.execute(new ValidateSessionInput('viejo'))).toBeInstanceOf(
      SessionInvalid,
    );
    expect(await validate.execute(new ValidateSessionInput('revocado'))).toBeInstanceOf(
      SessionInvalid,
    );
  });

  it('rejects a session whose user was deactivated', async () => {
    const { sessions, users, validate } = build();
    await seedUser(users, false);
    await sessions.save(Session.startAt('t1', 'u1', NOW));

    expect(await validate.execute(new ValidateSessionInput('t1'))).toBeInstanceOf(SessionInvalid);
  });

  it('renews the session past half-life', async () => {
    const late = new Date(NOW.getTime() + (SESSION_TTL_MS * 3) / 4);
    const { sessions, users, validate } = build(late);
    await seedUser(users);
    await sessions.save(Session.startAt('t1', 'u1', NOW));

    const result = await validate.execute(new ValidateSessionInput('t1'));

    expect(result).toBeInstanceOf(SessionValid);
    const stored = await sessions.findByToken('t1');
    expect(stored?.expiresAt.getTime()).toBe(late.getTime() + SESSION_TTL_MS);
  });
});
