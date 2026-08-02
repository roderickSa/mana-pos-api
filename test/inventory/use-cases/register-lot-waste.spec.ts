import { ProductLot } from '#modules/inventory/domain/product-lot.js';
import { LotNotFoundById } from '#modules/inventory/use-cases/expiry/expiry.js';
import { RegisterStockAdjustment } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.js';
import { StockAdjusted } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.output.js';
import {
  RegisterLotWaste,
  RegisterLotWasteInput,
} from '#modules/inventory/use-cases/register-lot-waste/register-lot-waste.js';
import { InventoryRepositoryForTesting } from '../test-doubles/inventory-repository-for-testing.js';
import { LotRepositoryForTesting } from '../test-doubles/lot-repository-for-testing.js';
import { IdGeneratorForTesting } from '../../shared/test-doubles/id-generator-for-testing.js';
import { TimeManagerForTesting } from '../../shared/test-doubles/time-manager-for-testing.js';

const NOW = new Date('2026-08-02T10:00:00Z');

function build() {
  const inventory = new InventoryRepositoryForTesting();
  const lots = new LotRepositoryForTesting();
  const adjust = new RegisterStockAdjustment(
    inventory,
    new IdGeneratorForTesting(),
    new TimeManagerForTesting(NOW),
  );
  return { inventory, lots, waste: new RegisterLotWaste(lots, adjust) };
}

describe('RegisterLotWaste', () => {
  it('descuenta stock y reduce el lote en una merma parcial', async () => {
    const { inventory, lots, waste } = build();
    inventory.seedStock('aceite', 12);
    await lots.save(new ProductLot('l1', 'aceite', 12, NOW, NOW));

    const result = await waste.execute(new RegisterLotWasteInput('l1', 5, 'Rosa'));

    expect(result).toBeInstanceOf(StockAdjusted);
    expect((await inventory.getStock('aceite'))?.quantity).toBe(7);
    expect((await lots.findById('l1'))?.quantity).toBe(7);
  });

  it('elimina el lote cuando la merma lo consume completo', async () => {
    const { inventory, lots, waste } = build();
    inventory.seedStock('aceite', 12);
    await lots.save(new ProductLot('l1', 'aceite', 12, NOW, NOW));

    const result = await waste.execute(new RegisterLotWasteInput('l1', 12, 'Rosa'));

    expect(result).toBeInstanceOf(StockAdjusted);
    expect(await lots.findById('l1')).toBeNull();
  });

  it('reporta lote inexistente sin tocar stock', async () => {
    const { inventory, waste } = build();
    inventory.seedStock('aceite', 12);

    expect(await waste.execute(new RegisterLotWasteInput('nope', 5, 'Rosa'))).toBeInstanceOf(
      LotNotFoundById,
    );
    expect((await inventory.getStock('aceite'))?.quantity).toBe(12);
  });
});
