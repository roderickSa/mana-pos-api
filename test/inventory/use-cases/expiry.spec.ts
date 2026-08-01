import {
  ExpiringList,
  GetExpiringProducts,
  ProductExpirySet,
  SetProductExpiry,
  SetProductExpiryInput,
} from '#modules/inventory/use-cases/expiry/expiry.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('GetExpiringProducts', () => {
  it('lists only products expiring within the alert window', async () => {
    const repository = new InventoryRepositoryForTesting();
    const timeManager = new TimeManagerForTesting();
    const now = timeManager.now();
    repository.seedStock('leche', 5);
    repository.seedStock('yogurt', 3);
    repository.seedStock('arroz', 20);
    await repository.setProductExpiry('leche', new Date(now.getTime() + 2 * DAY_MS));
    await repository.setProductExpiry('yogurt', new Date(now.getTime() + 30 * DAY_MS));

    const result = await new GetExpiringProducts(repository, timeManager).execute(7);

    expect(result).toBeInstanceOf(ExpiringList);
    expect(result.alertDays).toBe(7);
    expect(result.items.map((item) => item.productId)).toEqual(['leche']);
    expect(result.items[0]?.daysLeft(now)).toBe(2);
  });
});

describe('SetProductExpiry', () => {
  it('sets and clears the expiry date', async () => {
    const repository = new InventoryRepositoryForTesting();
    repository.seedStock('leche', 5);
    const useCase = new SetProductExpiry(repository);
    const expiry = new Date('2026-08-15T12:00:00');

    expect(await useCase.execute(new SetProductExpiryInput('leche', expiry))).toBeInstanceOf(
      ProductExpirySet,
    );
    expect(repository.expiryOf('leche')).toEqual(expiry);

    await useCase.execute(new SetProductExpiryInput('leche', null));
    expect(repository.expiryOf('leche')).toBeNull();
  });
});
