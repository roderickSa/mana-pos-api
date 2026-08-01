import type { Nullable } from '#shared/domain/nullable.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import type { ExpiringProduct } from '#modules/inventory/domain/expiring-product.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export class ExpiringList {
  constructor(
    readonly alertDays: number,
    readonly items: ExpiringProduct[],
  ) {}
}

// Vencidos y por vencer dentro de la ventana de alerta.
export class GetExpiringProducts {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(alertDays: number): Promise<ExpiringList> {
    const limit = new Date(this.timeManager.now().getTime() + alertDays * DAY_MS);
    const items = await this.inventoryRepository.listExpiring(limit);
    return new ExpiringList(alertDays, items);
  }
}

export class SetProductExpiryInput {
  constructor(
    readonly productId: string,
    readonly expiryDate: Nullable<Date>,
  ) {}
}

export class ProductExpirySet {}

export class SetProductExpiry {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: SetProductExpiryInput): Promise<ProductExpirySet> {
    await this.inventoryRepository.setProductExpiry(input.productId, input.expiryDate);
    return new ProductExpirySet();
  }
}
