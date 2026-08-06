import { exhaustive } from '#shared/domain/exhaustive.js';
import {
  CashMovementRegistered,
  MovementExceedsCash,
  NoSessionForMovement,
  RegisterCashMovement,
  RegisterCashMovementInput,
} from '#modules/cash/use-cases/register-cash-movement/register-cash-movement.js';
import {
  RefundCashPaid,
  RefundCashRejected,
  type RefundCash,
  type RefundCashResult,
} from '#modules/sales/ports/refund-cash.js';

// Adapter: la devolución en efectivo es un movimiento de caja tipo 'refund'
// sobre la sesión abierta (aparece en el turno y en el reporte Z).
export class CashModuleRefundCash implements RefundCash {
  constructor(private readonly registerCashMovement: RegisterCashMovement) {}

  async payOutRefund(
    amountCents: number,
    concept: string,
    userId: string,
  ): Promise<RefundCashResult> {
    const result = await this.registerCashMovement.execute(
      new RegisterCashMovementInput('refund', amountCents, concept, userId),
    );
    if (result instanceof CashMovementRegistered) {
      return new RefundCashPaid();
    }
    if (result instanceof NoSessionForMovement) {
      return new RefundCashRejected(
        'La caja está cerrada. Ábrela para poder pagar la devolución.',
      );
    }
    if (result instanceof MovementExceedsCash) {
      return new RefundCashRejected(
        'No hay suficiente efectivo en caja para pagar esta devolución.',
      );
    }
    exhaustive(result);
  }
}
