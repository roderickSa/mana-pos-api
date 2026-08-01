import { IgvService } from '#modules/settings/use-cases/igv-service.js';
import { SettingsRepositoryForTesting } from '../test-doubles/settings-repository-for-testing.js';

describe('IgvService', () => {
  it('defaults to 18% when nothing is configured', async () => {
    const service = new IgvService(new SettingsRepositoryForTesting());
    expect(await service.getRatePercent()).toBe(18);
  });

  it('persists the configured rate, including zero', async () => {
    const service = new IgvService(new SettingsRepositoryForTesting());

    expect(await service.setRatePercent(10)).toBe(10);
    expect(await service.getRatePercent()).toBe(10);

    expect(await service.setRatePercent(0)).toBe(0);
    expect(await service.getRatePercent()).toBe(0);
  });

  it('bounds out-of-range rates', async () => {
    const service = new IgvService(new SettingsRepositoryForTesting());

    expect(await service.setRatePercent(40)).toBe(25);
    expect(await service.setRatePercent(-3)).toBe(0);
  });
});
