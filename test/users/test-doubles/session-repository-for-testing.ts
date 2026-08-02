import type { Nullable } from '#shared/domain/nullable.js';
import type { Session } from '#modules/users/domain/session.js';
import type { SessionRepository } from '#modules/users/ports/session-repository.js';

export class SessionRepositoryForTesting implements SessionRepository {
  private readonly sessionsByToken = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessionsByToken.set(session.token, session);
  }

  async findByToken(token: string): Promise<Nullable<Session>> {
    return this.sessionsByToken.get(token) ?? null;
  }

  async deleteExpiredBefore(at: Date): Promise<void> {
    for (const [token, session] of this.sessionsByToken) {
      if (session.expiresAt.getTime() < at.getTime()) {
        this.sessionsByToken.delete(token);
      }
    }
  }

  count(): number {
    return this.sessionsByToken.size;
  }
}
