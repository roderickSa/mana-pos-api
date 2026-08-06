import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { GetKardex } from '#modules/inventory/use-cases/get-kardex/get-kardex.js';
import { GetKardexInput } from '#modules/inventory/use-cases/get-kardex/get-kardex.input.js';
import { KardexFound } from '#modules/inventory/use-cases/get-kardex/get-kardex.output.js';
import { ProductNotFoundInInventory } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';

// El repo real devuelve los movimientos del más NUEVO al más viejo; el double
// respeta el orden de inserción, así que aquí se insertan igual.
function movement(id: string, quantity: number, at: string): StockMovement {
  return new StockMovement(
    id,
    'arroz',
    quantity > 0 ? 'purchase' : 'sale',
    quantity,
    null,
    null,
    null,
    'encargado',
    new Date(at),
  );
}

describe('GetKardex', () => {
  it('computes the balance after each movement, anchored on current stock', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('arroz', 47);
    await repository.applyMovements([
      movement('m3', -3, '2026-08-06T10:00:00Z'),
      movement('m2', 10, '2026-08-05T10:00:00Z'),
      movement('m1', -2, '2026-08-04T10:00:00Z'),
    ]);
    // applyMovements muta el stock del double: lo re-anclamos al valor actual.
    repository.seedStock('arroz', 47);

    const result = await new GetKardex(repository).execute(new GetKardexInput('arroz'));

    expect(result).toBeInstanceOf(KardexFound);
    if (!(result instanceof KardexFound)) throw new Error('unreachable');
    expect(result.currentQuantity).toBe(47);
    // Del más nuevo al más viejo: 47 (tras m3), 50 (tras m2), 40 (tras m1).
    expect(result.entries.map((entry) => entry.balanceAfter)).toEqual([47, 50, 40]);
    expect(result.entries.map((entry) => entry.movement.id)).toEqual(['m3', 'm2', 'm1']);
  });

  it('returns not found when the product has no stock record', async () => {
    const repository = new InventoryRepositoryForTesting();
    const result = await new GetKardex(repository).execute(new GetKardexInput('fantasma'));
    expect(result).toBeInstanceOf(ProductNotFoundInInventory);
  });
});
