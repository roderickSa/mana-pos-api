import type { Nullable } from '#shared/domain/nullable.js';
import type { AdjustmentKind } from '#modules/inventory/domain/adjustment-kind.js';

// quantity siempre positiva: es lo que se retira del stock por merma/caducidad/robo.
export class RegisterStockAdjustmentInput {
  constructor(
    readonly productId: string,
    readonly kind: AdjustmentKind,
    readonly quantity: number,
    readonly reason: Nullable<string>,
    readonly userId: string,
  ) {}
}
