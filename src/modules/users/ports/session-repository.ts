import type { Nullable } from '#shared/domain/nullable.js';
import type { Session } from '#modules/users/domain/session.js';

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByToken(token: string): Promise<Nullable<Session>>;
  deleteExpiredBefore(at: Date): Promise<void>;
}
