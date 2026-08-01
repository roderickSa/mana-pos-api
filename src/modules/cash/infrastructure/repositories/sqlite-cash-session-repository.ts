import { desc, eq } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { cashMovements, cashSessions } from '#shared/infrastructure/database/schema.js';
import {
  CashMovement,
  CashSession,
  ClosedCashSessionStatus,
  OpenCashSessionStatus,
} from '#modules/cash/domain/cash-session.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';

type SessionRow = typeof cashSessions.$inferSelect;
type MovementRow = typeof cashMovements.$inferSelect;

export class SqliteCashSessionRepository implements CashSessionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(session: CashSession): Promise<void> {
    const row = {
      id: session.id,
      shift: session.shift,
      status: session.status.name,
      openedBy: session.openedBy,
      openedAt: session.openedAt,
      openingAmountCents: session.openingAmountCents,
      closedBy: session.closedBy,
      closedAt: session.closedAt,
      expectedCashCents: session.expectedCashCents,
      countedCashCents: session.countedCashCents,
    };
    await this.db.insert(cashSessions).values(row).onConflictDoUpdate({ target: cashSessions.id, set: row });
  }

  async findOpen(): Promise<Nullable<CashSession>> {
    const row = await this.db.query.cashSessions.findFirst({ where: eq(cashSessions.status, 'open') });
    return row === undefined ? null : toSession(row);
  }

  async appendMovement(movement: CashMovement): Promise<void> {
    await this.db.insert(cashMovements).values({
      id: movement.id,
      cashSessionId: movement.cashSessionId,
      type: movement.kind,
      amountCents: movement.amountCents,
      concept: movement.concept,
      userId: movement.userId,
      createdAt: movement.createdAt,
    });
  }

  async movementsOf(sessionId: string): Promise<CashMovement[]> {
    const rows = await this.db
      .select()
      .from(cashMovements)
      .where(eq(cashMovements.cashSessionId, sessionId))
      .orderBy(desc(cashMovements.createdAt));
    return rows.map(toMovement);
  }

  async lastClosed(): Promise<Nullable<CashSession>> {
    const rows = await this.db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.status, 'closed'))
      .orderBy(desc(cashSessions.closedAt))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toSession(row);
  }

  async listClosed(limit: number): Promise<CashSession[]> {
    const rows = await this.db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.status, 'closed'))
      .orderBy(desc(cashSessions.closedAt))
      .limit(limit);
    return rows.map(toSession);
  }
}

function toSession(row: SessionRow): CashSession {
  return new CashSession(
    row.id,
    row.shift,
    row.status === 'open' ? new OpenCashSessionStatus() : new ClosedCashSessionStatus(),
    row.openedBy,
    row.openedAt,
    row.openingAmountCents,
    row.closedBy,
    row.closedAt,
    row.expectedCashCents,
    row.countedCashCents,
  );
}

function toMovement(row: MovementRow): CashMovement {
  return new CashMovement(
    row.id,
    row.cashSessionId,
    row.type,
    row.amountCents,
    row.concept,
    row.userId,
    row.createdAt,
  );
}
