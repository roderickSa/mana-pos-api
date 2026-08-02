import { SESSION_TTL_MS, Session } from '#modules/users/domain/session.js';
import { Logout, LoggedOut, LogoutInput, SessionNotFound } from '#modules/users/use-cases/logout/logout.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';
import { SessionRepositoryForTesting } from '../test-doubles/session-repository-for-testing.js';

const NOW = new Date('2026-08-02T10:00:00Z');

describe('Session', () => {
  it('lives 12 hours and dies at expiry or revocation', () => {
    const session = Session.startAt('t1', 'u1', NOW);

    expect(session.isActiveAt(NOW)).toBe(true);
    expect(session.isActiveAt(new Date(NOW.getTime() + SESSION_TTL_MS - 1))).toBe(true);
    expect(session.isActiveAt(new Date(NOW.getTime() + SESSION_TTL_MS))).toBe(false);
    expect(session.revokedNow(NOW).isActiveAt(NOW)).toBe(false);
  });

  it('asks for renewal only past half-life, and renewal extends expiry', () => {
    const session = Session.startAt('t1', 'u1', NOW);
    const early = new Date(NOW.getTime() + SESSION_TTL_MS / 4);
    const late = new Date(NOW.getTime() + (SESSION_TTL_MS * 3) / 4);

    expect(session.needsRenewalAt(early)).toBe(false);
    expect(session.needsRenewalAt(late)).toBe(true);
    const renewed = session.renewedAt(late);
    expect(renewed.expiresAt.getTime()).toBe(late.getTime() + SESSION_TTL_MS);
  });
});

describe('Logout', () => {
  it('revokes an active session (and is idempotent)', async () => {
    const sessions = new SessionRepositoryForTesting();
    const session = Session.startAt('t1', 'u1', NOW);
    await sessions.save(session);
    const logout = new Logout(sessions, new TimeManagerForTesting());

    expect(await logout.execute(new LogoutInput('t1'))).toBeInstanceOf(LoggedOut);
    const revoked = await sessions.findByToken('t1');
    expect(revoked?.revokedAt).not.toBeNull();

    expect(await logout.execute(new LogoutInput('t1'))).toBeInstanceOf(LoggedOut);
  });

  it('reports an unknown token', async () => {
    const logout = new Logout(new SessionRepositoryForTesting(), new TimeManagerForTesting());
    expect(await logout.execute(new LogoutInput('nope'))).toBeInstanceOf(SessionNotFound);
  });
});
