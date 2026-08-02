import { eq, lt } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { sessions } from '#shared/infrastructure/database/schema.js';
import { Session } from '#modules/users/domain/session.js';
import type { SessionRepository } from '#modules/users/ports/session-repository.js';

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(session: Session): Promise<void> {
    await this.db
      .insert(sessions)
      .values({
        token: session.token,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
      })
      .onConflictDoUpdate({
        target: sessions.token,
        set: { expiresAt: session.expiresAt, revokedAt: session.revokedAt },
      });
  }

  async findByToken(token: string): Promise<Nullable<Session>> {
    const row = await this.db.query.sessions.findFirst({ where: eq(sessions.token, token) });
    if (row === undefined) return null;
    return new Session(row.token, row.userId, row.createdAt, row.expiresAt, row.revokedAt);
  }

  async deleteExpiredBefore(at: Date): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, at));
  }
}
