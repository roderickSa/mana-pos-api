import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import type { GetKardexInput } from '#modules/inventory/use-cases/get-kardex/get-kardex.input.js';
import {
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

    const movements = await this.inventoryRepository.findMovementsByProductId(input.productId);
    return new KardexFound(input.productId, stock.quantity, movements);
  }
}
