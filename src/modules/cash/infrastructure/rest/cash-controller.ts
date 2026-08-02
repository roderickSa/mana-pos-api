import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import { z } from 'zod';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type {
  CashBreakdown,
  CashMovement,
  CashSession,
} from '#modules/cash/domain/cash-session.js';
import {
  OpenCashSession,
  OpenCashSessionInput,
  SessionAlreadyOpen,
  SessionOpened,
} from '#modules/cash/use-cases/open-cash-session/open-cash-session.js';
import {
  GetCashStatus,
  NoOpenSession,
  OpenSessionStatus,
} from '#modules/cash/use-cases/get-cash-status/get-cash-status.js';
import {
  CashMovementRegistered,
  MovementExceedsCash,
  NoSessionForMovement,
  RegisterCashMovement,
  RegisterCashMovementInput,
} from '#modules/cash/use-cases/register-cash-movement/register-cash-movement.js';
import {
  CloseCashSession,
  CloseCashSessionInput,
  ClosingNoteRequired,
  NoSessionToClose,
  SessionClosed,
} from '#modules/cash/use-cases/close-cash-session/close-cash-session.js';
import {
  CloseSummaryPrinted,
  NoClosedSessionToPrint,
  PrintCloseSummary,
  SessionAlreadyReopened,
} from '#modules/cash/use-cases/print-close-summary/print-close-summary.js';

const openDto = z.object({
  shift: z.enum(['morning', 'afternoon']),
  openingAmountCents: z.number().int().nonnegative(),
  userId: z.string().min(1).default('encargado'),
});

const movementDto = z.object({
  kind: z.enum(['withdrawal', 'expense', 'deposit']),
  amountCents: z.number().int().positive(),
  concept: z.string().min(1),
  userId: z.string().min(1).default('encargado'),
});

const closeDto = z.object({
  countedCashCents: z.number().int().nonnegative(),
  userId: z.string().min(1).default('encargado'),
  note: z.string().max(200).nullish(),
});

function toSessionResponse(session: CashSession): Record<string, unknown> {
  return {
    id: session.id,
    shift: session.shift,
    status: session.status.name,
    openedBy: session.openedBy,
    openedAt: session.openedAt.toISOString(),
    openingAmountCents: session.openingAmountCents,
    closedAt: session.closedAt?.toISOString() ?? null,
    expectedCashCents: session.expectedCashCents,
    countedCashCents: session.countedCashCents,
    closedBy: session.closedBy,
    closingNote: session.closingNote,
  };
}

function toBreakdownResponse(breakdown: CashBreakdown): Record<string, unknown> {
  return {
    openingCents: breakdown.openingCents,
    cashSalesCents: breakdown.cashSalesCents,
    cashAbonosCents: breakdown.cashAbonosCents,
    withdrawalsCents: breakdown.withdrawalsCents,
    expensesCents: breakdown.expensesCents,
    depositsCents: breakdown.depositsCents,
    currentCashCents: breakdown.currentCashCents,
  };
}

function toMovementResponse(movement: CashMovement): Record<string, unknown> {
  return {
    id: movement.id,
    kind: movement.kind,
    amountCents: movement.amountCents,
    concept: movement.concept,
    userId: movement.userId,
    createdAt: movement.createdAt.toISOString(),
  };
}

export class CashController {
  constructor(
    private readonly openCashSession: OpenCashSession,
    private readonly getCashStatus: GetCashStatus,
    private readonly registerCashMovement: RegisterCashMovement,
    private readonly closeCashSession: CloseCashSession,
    private readonly printCloseSummary: PrintCloseSummary,
    private readonly cashSessionRepository: CashSessionRepository,
  ) {}

  // Historial de cierres: hasta 30 cortes anteriores, del más reciente atrás.
  async history(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessions = await this.cashSessionRepository.listClosed(30);
    await reply.status(200).send(sessions.map(toSessionResponse));
  }

  async printLastClose(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.printCloseSummary.execute();
    if (result instanceof CloseSummaryPrinted) {
      await reply.status(200).send({
        printerWarning: result.printerWarning,
        message: result.printerWarning ?? 'Resumen de cierre enviado a la impresora.',
      });
      return;
    }
    if (result instanceof NoClosedSessionToPrint) {
      await reply.status(409).send({
        code: 'NO_CLOSED_SESSION',
        message: 'Todavía no hay ningún cierre de caja para imprimir.',
      });
      return;
    }
    if (result instanceof SessionAlreadyReopened) {
      await reply.status(409).send({
        code: 'SESSION_REOPENED',
        message: 'Ya hay una caja nueva abierta: el resumen se imprime justo al cerrar.',
      });
      return;
    }
    exhaustive(result);
  }

  async status(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.getCashStatus.execute();
    if (result instanceof OpenSessionStatus) {
      await reply.status(200).send({
        open: true,
        session: toSessionResponse(result.session),
        breakdown: toBreakdownResponse(result.breakdown),
        movements: result.movements.map(toMovementResponse),
      });
      return;
    }
    if (result instanceof NoOpenSession) {
      await reply.status(200).send({
        open: false,
        lastClosed: result.lastClosed === null ? null : toSessionResponse(result.lastClosed),
      });
      return;
    }
    exhaustive(result);
  }

  async open(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = openDto.parse(request.body);
    const result = await this.openCashSession.execute(
      new OpenCashSessionInput(body.shift, body.openingAmountCents, body.userId),
    );
    if (result instanceof SessionOpened) {
      await reply.status(201).send(toSessionResponse(result.session));
      return;
    }
    if (result instanceof SessionAlreadyOpen) {
      await reply.status(409).send({
        code: 'SESSION_ALREADY_OPEN',
        message: 'Ya hay una caja abierta. Ciérrala antes de abrir otra.',
      });
      return;
    }
    exhaustive(result);
  }

  async movement(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = movementDto.parse(request.body);
    const result = await this.registerCashMovement.execute(
      new RegisterCashMovementInput(body.kind, body.amountCents, body.concept, body.userId),
    );
    if (result instanceof CashMovementRegistered) {
      await reply.status(201).send({
        movement: toMovementResponse(result.movement),
        currentCashCents: result.currentCashCents,
      });
      return;
    }
    if (result instanceof NoSessionForMovement) {
      await reply.status(409).send({
        code: 'NO_SESSION_OPEN',
        message: 'No hay caja abierta. Abre la caja primero.',
      });
      return;
    }
    if (result instanceof MovementExceedsCash) {
      await reply.status(409).send({
        code: 'MOVEMENT_EXCEEDS_CASH',
        currentCashCents: result.currentCashCents,
        message: `No hay tanto efectivo en caja (hay S/ ${(result.currentCashCents / 100).toFixed(2)}).`,
      });
      return;
    }
    exhaustive(result);
  }

  async close(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = closeDto.parse(request.body);
    const result = await this.closeCashSession.execute(
      new CloseCashSessionInput(body.countedCashCents, body.userId, body.note ?? null),
    );
    if (result instanceof SessionClosed) {
      await reply.status(200).send({
        session: toSessionResponse(result.session),
        breakdown: toBreakdownResponse(result.breakdown),
        differenceCents: result.differenceCents,
        salesByMethod: result.salesByMethod,
      });
      return;
    }
    if (result instanceof NoSessionToClose) {
      await reply.status(409).send({
        code: 'NO_SESSION_OPEN',
        message: 'No hay caja abierta que cerrar.',
      });
      return;
    }
    if (result instanceof ClosingNoteRequired) {
      const soles = (Math.abs(result.differenceCents) / 100).toFixed(2);
      await reply.status(409).send({
        code: 'NOTE_REQUIRED',
        differenceCents: result.differenceCents,
        message: `El conteo no cuadra (${result.differenceCents > 0 ? 'sobran' : 'faltan'} S/ ${soles}). Explica el motivo para poder cerrar.`,
      });
      return;
    }
    exhaustive(result);
  }
}
