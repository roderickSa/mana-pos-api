import { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import { SqliteInventoryRepository } from '#modules/inventory/infrastructure/repositories/sqlite-inventory-repository.js';
import { SqliteProductRepository } from '#modules/catalog/infrastructure/repositories/sqlite-product-repository.js';
import { createDatabaseClient, runMigrations } from '#shared/infrastructure/database/client.js';
import { unitProductMother } from '../../catalog/mothers/product.mother.js';

describe('SqliteInventoryRepository', () => {
  let repository: SqliteInventoryRepository;
  let productRepository: SqliteProductRepository;

  beforeEach(async () => {
    const db = createDatabaseClient(':memory:');
    runMigrations(db, './drizzle');
    repository = new SqliteInventoryRepository(db);
    productRepository = new SqliteProductRepository(db);
    await productRepository.save(unitProductMother({ id: 'p1', stockUnits: 10 }));
  });

  it('applies movements atomically updating stock', async () => {
    await repository.applyMovements([
      new StockMovement('m1', 'p1', 'sale', -3, -1050, null, 'ticket-1', 'rosa', new Date()),
    ]);

    expect((await repository.getStock('p1'))?.quantity).toBe(7);
    const byTicket = await repository.findMovementsByTicketId('ticket-1');
    expect(byTicket).toHaveLength(1);
    expect(byTicket[0]?.kind).toBe('sale');
  });

  it('lists kardex movements by product', async () => {
    await repository.applyMovements([
      new StockMovement('m1', 'p1', 'purchase', 12, 3360, null, null, 'encargado', new Date('2026-07-01')),
      new StockMovement('m2', 'p1', 'waste', -2, -560, 'vencido', null, 'encargado', new Date('2026-07-02')),
    ]);

    const movements = await repository.findMovementsByProductId('p1');

    expect(movements).toHaveLength(2);
    expect((await repository.getStock('p1'))?.quantity).toBe(20);
  });

  it('returns null stock for unknown products', async () => {
    expect(await repository.getStock('nope')).toBeNull();
  });
});
