import type { Nullable } from '#shared/domain/nullable.js';

// Vida de la sesión: 12 horas — cubre el turno más largo de la tienda. Se
// renueva sola cuando queda menos de la mitad de vida, así el POS nunca pide
// PIN a mitad de una venta por expiración.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class Session {
  constructor(
    readonly token: string,
    readonly userId: string,
    readonly createdAt: Date,
    readonly expiresAt: Date,
    readonly revokedAt: Nullable<Date>,
  ) {}

  static startAt(token: string, userId: string, now: Date): Session {
    return new Session(token, userId, now, new Date(now.getTime() + SESSION_TTL_MS), null);
  }

  isActiveAt(now: Date): boolean {
    return this.revokedAt === null && now.getTime() < this.expiresAt.getTime();
  }

  needsRenewalAt(now: Date): boolean {
    return this.isActiveAt(now) && this.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS / 2;
  }

  renewedAt(now: Date): Session {
    return new Session(
      this.token,
      this.userId,
      this.createdAt,
      new Date(now.getTime() + SESSION_TTL_MS),
      this.revokedAt,
    );
  }

  revokedNow(at: Date): Session {
    return new Session(this.token, this.userId, this.createdAt, this.expiresAt, at);
  }
}
