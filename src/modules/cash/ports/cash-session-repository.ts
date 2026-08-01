import type { Nullable } from '#shared/domain/nullable.js';
import type { CashMovement, CashSession } from '#modules/cash/domain/cash-session.js';

export interface CashSessionRepository {
  save(session: CashSession): Promise<void>;
  findOpen(): Promise<Nullable<CashSession>>;
  appendMovement(movement: CashMovement): Promise<void>;
  movementsOf(sessionId: string): Promise<CashMovement[]>;
  lastClosed(): Promise<Nullable<CashSession>>;
  // Historial de cierres, del más reciente al más antiguo.
  listClosed(limit: number): Promise<CashSession[]>;
}
