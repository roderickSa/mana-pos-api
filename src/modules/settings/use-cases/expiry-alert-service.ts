import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

const EXPIRY_KEY = 'expiry-alert-days';
const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

// Días de anticipación con que Inventario avisa los vencimientos.
export class ExpiryAlertService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getDays(): Promise<number> {
    const raw = await this.settingsRepository.get(EXPIRY_KEY);
    if (raw === null) return DEFAULT_DAYS;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed < 1 || parsed > MAX_DAYS ? DEFAULT_DAYS : parsed;
  }

  async setDays(days: number): Promise<number> {
    const bounded = Math.min(MAX_DAYS, Math.max(1, Math.round(days)));
    await this.settingsRepository.set(EXPIRY_KEY, String(bounded));
    return bounded;
  }
}
