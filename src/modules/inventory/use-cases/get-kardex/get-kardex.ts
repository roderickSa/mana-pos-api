import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { GetKardexInput } from '#modules/inventory/use-cases/get-kardex/get-kardex.input.js';
import {
  KardexEntry,
  KardexFound,
  type GetKardexResult,
} from '#modules/inventory/use-cases/get-kardex/get-kardex.output.js';

export class GetKardex {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: GetKardexInput): Promise<GetKardexResult> {
    const stock = await this.inventoryRepository.getStock(input.productId);
    if (stock === null) {
      return new ProductNotFoundInInventory(input.productId);
    }

    // El saldo se ancla en el stock ACTUAL y se camina hacia atrás (los
    // movimientos vienen del más nuevo al más viejo): así cuadra aunque la
    // historia vieja esté incompleta (stock sembrado antes del primer registro).
    const movements = await this.inventoryRepository.findMovementsByProductId(input.productId);
    let balance = stock.quantity;
    const entries = movements.map((movement) => {
      const entry = new KardexEntry(movement, balance);
      balance -= movement.quantity;
      return entry;
    });
    return new KardexFound(input.productId, stock.quantity, entries);
  }
}
