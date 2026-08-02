import {
  ProductLot,
  ProductLotGroup,
  remainingPerLot,
} from '#modules/inventory/domain/product-lot.js';
import {
  ExpiringList,
  GetExpiringLots,
  LotNotFoundById,
  LotRemoved,
  LotUpdated,
  RemoveLot,
  UpdateLotExpiry,
} from '#modules/inventory/use-cases/expiry/expiry.js';
import { LotRepositoryForTesting } from '../test-doubles/lot-repository-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-02T10:00:00Z');

function lot(id: string, productId: string, quantity: number, inDays: number): ProductLot {
  return new ProductLot(id, productId, quantity, new Date(NOW.getTime() + inDays * DAY_MS), NOW);
}

describe('remainingPerLot (rotación: lo que vence primero se vende primero)', () => {
  it('descuenta lo consumido empezando por el lote más próximo a vencer', () => {
    // El caso Aceite Primor: 12+20+19 = 51 en lotes, quedan 40 → se
    // consumieron 11 del lote más próximo.
    const group = new ProductLotGroup('aceite', 'Aceite Primor', 'unit', 40, [
      lot('l2', 'aceite', 20, 60),
      lot('l1', 'aceite', 12, 3),
      lot('l3', 'aceite', 19, 120),
    ]);

    const remaining = remainingPerLot(group);

    expect(remaining.map((entry) => [entry.lot.id, entry.remaining])).toEqual([
      ['l1', 1],
      ['l2', 20],
      ['l3', 19],
    ]);
  });

  it('el stock sin lote no descuenta lotes, y un lote agotado queda en cero', () => {
    const sinConsumo = remainingPerLot(
      new ProductLotGroup('p', 'P', 'unit', 99, [lot('l1', 'p', 10, 5)]),
    );
    expect(sinConsumo[0]?.remaining).toBe(10);

    const agotado = remainingPerLot(
      new ProductLotGroup('p', 'P', 'unit', 4, [lot('l1', 'p', 10, 5), lot('l2', 'p', 6, 30)]),
    );
    expect(agotado.map((entry) => entry.remaining)).toEqual([0, 4]);
  });
});

describe('GetExpiringLots', () => {
  it('lista solo lotes con resto dentro de la ventana, ordenados por fecha', async () => {
    const lots = new LotRepositoryForTesting();
    lots.seedProduct('aceite', 'Aceite Primor', 'unit', 40);
    await lots.save(lot('l1', 'aceite', 12, 3));
    await lots.save(lot('l2', 'aceite', 20, 60));
    lots.seedProduct('leche', 'Leche Gloria', 'unit', 0); // vendida por completo
    await lots.save(lot('l3', 'leche', 6, 2));

    const time = new TimeManagerForTesting(NOW);
    const result = await new GetExpiringLots(lots, time).execute(7);

    expect(result).toBeInstanceOf(ExpiringList);
    // l2 vence fuera de la ventana; l3 ya no tiene resto (stock 0).
    expect(result.items.map((item) => item.lotId)).toEqual(['l1']);
    expect(result.items[0]?.remainingQuantity).toBe(12);
    expect(result.items[0]?.daysLeft(NOW)).toBe(3);
  });
});

describe('UpdateLotExpiry / RemoveLot', () => {
  it('actualiza la fecha de un lote y elimina lotes', async () => {
    const lots = new LotRepositoryForTesting();
    await lots.save(lot('l1', 'aceite', 12, 3));
    const newDate = new Date(NOW.getTime() + 45 * DAY_MS);

    const updated = await new UpdateLotExpiry(lots).execute('l1', newDate);
    expect(updated).toBeInstanceOf(LotUpdated);
    expect((await lots.findById('l1'))?.expiryDate).toEqual(newDate);

    expect(await new RemoveLot(lots).execute('l1')).toBeInstanceOf(LotRemoved);
    expect(await lots.findById('l1')).toBeNull();
  });

  it('reporta lote inexistente', async () => {
    const lots = new LotRepositoryForTesting();
    expect(await new UpdateLotExpiry(lots).execute('nope', NOW)).toBeInstanceOf(LotNotFoundById);
    expect(await new RemoveLot(lots).execute('nope')).toBeInstanceOf(LotNotFoundById);
  });
});
