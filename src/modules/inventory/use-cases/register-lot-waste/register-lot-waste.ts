import type { LotRepository } from '#modules/inventory/ports/lot-repository.js';
import { LotNotFoundById } from '#modules/inventory/use-cases/expiry/expiry.js';
import { RegisterStockAdjustment } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.js';
import { RegisterStockAdjustmentInput } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.input.js';
import {
  StockAdjusted,
  type RegisterStockAdjustmentResult,
} from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.output.js';

export class RegisterLotWasteInput {
  constructor(
    readonly lotId: string,
    // Unidades o gramos, según el tipo de venta del producto.
    readonly quantity: number,
    readonly userId: string,
  ) {}
}

export type RegisterLotWasteResult = RegisterStockAdjustmentResult | LotNotFoundById;

// Merma desde la alerta de vencimiento: descuenta el stock (movimiento de
// kardex tipo 'expiry') Y consume el lote — si se dio de baja completo, el
// lote desaparece y deja de alertar.
export class RegisterLotWaste {
  constructor(
    private readonly lotRepository: LotRepository,
    private readonly registerStockAdjustment: RegisterStockAdjustment,
  ) {}

  async execute(input: RegisterLotWasteInput): Promise<RegisterLotWasteResult> {
    const lot = await this.lotRepository.findById(input.lotId);
    if (lot === null) {
      return new LotNotFoundById(input.lotId);
    }
    const result = await this.registerStockAdjustment.execute(
      new RegisterStockAdjustmentInput(
        lot.productId,
        'expiry',
        input.quantity,
        'vencido — desde Por vencer',
        input.userId,
      ),
    );
    if (!(result instanceof StockAdjusted)) {
      return result;
    }
    const remaining = lot.quantity - input.quantity;
    if (remaining <= 0) {
      await this.lotRepository.delete(lot.id);
    } else {
      await this.lotRepository.save(lot.withQuantity(remaining));
    }
    return result;
  }
}
