import type { Nullable } from '#shared/domain/nullable.js';
import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';
import type { StockMovementPage } from '#modules/inventory/domain/stock-movement-page.js';
import { MovementSearchParams } from '#modules/inventory/ports/movement-search-params.js';
import type { InventoryRepository } from '#modules/inventory/ports/inventory-repository.js';
import type { SearchMovementsInput } from '#modules/inventory/use-cases/search-movements/search-movements.input.js';

export class SearchMovements {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(input: SearchMovementsInput): Promise<StockMovementPage> {
    return this.inventoryRepository.searchMovements(
      new MovementSearchParams(
        this.normalizeQuery(input.productQuery),
        input.kind,
        input.from,
        input.to,
        input.limit,
        input.offset,
      ),
    );
  }

  private normalizeQuery(query: Nullable<string>): Nullable<string> {
    if (query === null) return null;
    const normalized = normalizeSearchText(query);
    return normalized === '' ? null : normalized;
  }
}
