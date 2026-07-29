import type { Nullable } from '#shared/domain/nullable.js';
import {
  CashMovement,
  CashSession,
} from '#modules/cash/domain/cash-session.js';
import { MethodTotal, type CashInflowSource } from '#modules/cash/ports/cash-inflow-source.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import {
  CloseCashSession,
  CloseCashSessionInput,
  SessionClosed,
} from '#modules/cash/use-cases/close-cash-session/close-cash-session.js';
import {
  GetCashStatus,
  OpenSessionStatus,
} from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';
import {
  OpenCashSession,
  OpenCashSessionInput,
  SessionAlreadyOpen,
  SessionOpened,
} from '#modules/cash/use-cases/open-cash-session/open-cash-session.js';
import {
  CashMovementRegistered,
  MovementExceedsCash,
  RegisterCashMovement,
  RegisterCashMovementInput,
} from '#modules/cash/use-cases/register-cash-movement/register-cash-movement.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

class CashSessionRepositoryForTesting implements CashSessionRepository {
  private readonly sessions = new Map<string, CashSession>();
  private readonly movements: CashMovement[] = [];

  async save(session: CashSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findOpen(): Promise<Nullable<CashSession>> {
    return [...this.sessions.values()].find((session) => session.isOpen()) ?? null;
  }

  async appendMovement(movement: CashMovement): Promise<void> {
    this.movements.push(movement);
  }

  async movementsOf(sessionId: string): Promise<CashMovement[]> {
    return this.movements.filter((movement) => movement.cashSessionId === sessionId);
  }

  async lastClosed(): Promise<Nullable<CashSession>> {
    return [...this.sessions.values()].find((session) => !session.isOpen()) ?? null;
  }
}

class CashInflowSourceForTesting implements CashInflowSource {
  cashSales = 0;
  cashAbonos = 0;

  async cashFromSalesSince(): Promise<number> {
    return this.cashSales;
  }

  async cashFromAbonosSince(): Promise<number> {
    return this.cashAbonos;
  }

  async salesByMethodSince(): Promise<MethodTotal[]> {
    return [new MethodTotal('cash', this.cashSales)];
  }
}

function build() {
  const repository = new CashSessionRepositoryForTesting();
  const inflow = new CashInflowSourceForTesting();
  const idGenerator = new IdGeneratorForTesting();
  const timeManager = new TimeManagerForTesting();
  const openSession = new OpenCashSession(repository, idGenerator, timeManager);
  const status = new GetCashStatus(repository, inflow);
  const movement = new RegisterCashMovement(repository, status, idGenerator, timeManager);
  const close = new CloseCashSession(repository, inflow, status, timeManager);
  return { repository, inflow, openSession, status, movement, close };
}

describe('Cash sessions', () => {
  it('opens once and rejects a second open session', async () => {
    const { openSession } = build();

    const first = await openSession.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));
    const second = await openSession.execute(new OpenCashSessionInput('afternoon', 1000, 'encargado'));

    expect(first).toBeInstanceOf(SessionOpened);
    expect(second).toBeInstanceOf(SessionAlreadyOpen);
  });

  it('computes current cash: fondo + ventas + abonos − retiros − gastos', async () => {
    const { openSession, status, movement, inflow } = build();
    await openSession.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));
    inflow.cashSales = 10000;
    inflow.cashAbonos = 500;

    await movement.execute(new RegisterCashMovementInput('withdrawal', 3000, 'a la bóveda', 'encargado'));
    await movement.execute(new RegisterCashMovementInput('expense', 700, 'hielo', 'encargado'));
    const result = await status.execute();

    expect(result).toBeInstanceOf(OpenSessionStatus);
    if (!(result instanceof OpenSessionStatus)) return;
    expect(result.breakdown.currentCashCents).toBe(5000 + 10000 + 500 - 3000 - 700);
  });

  it('rejects withdrawals larger than the cash in the drawer', async () => {
    const { openSession, movement } = build();
    await openSession.execute(new OpenCashSessionInput('morning', 1000, 'encargado'));

    const result = await movement.execute(
      new RegisterCashMovementInput('withdrawal', 2000, 'demasiado', 'encargado'),
    );

    expect(result).toBeInstanceOf(MovementExceedsCash);
  });

  it('closes with arqueo: expected vs counted with difference', async () => {
    const { openSession, close, inflow } = build();
    await openSession.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));
    inflow.cashSales = 10000;

    const result = await close.execute(new CloseCashSessionInput(14800, 'encargado'));

    expect(result).toBeInstanceOf(SessionClosed);
    if (!(result instanceof SessionClosed)) return;
    expect(result.session.expectedCashCents).toBe(15000);
    expect(result.session.countedCashCents).toBe(14800);
    expect(result.differenceCents).toBe(-200);
    expect(result.session.isOpen()).toBe(false);
  });

  it('registers movements normally after a valid withdrawal', async () => {
    const { openSession, movement } = build();
    await openSession.execute(new OpenCashSessionInput('morning', 5000, 'encargado'));

    const result = await movement.execute(
      new RegisterCashMovementInput('withdrawal', 2000, 'cambio para el turno tarde', 'encargado'),
    );

    expect(result).toBeInstanceOf(CashMovementRegistered);
    if (!(result instanceof CashMovementRegistered)) return;
    expect(result.currentCashCents).toBe(3000);
  });
});
