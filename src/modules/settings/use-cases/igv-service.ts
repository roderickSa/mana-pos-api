import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

const IGV_KEY = 'igv-rate-percent';
const DEFAULT_RATE = 18;
const MAX_RATE = 25;

// Tasa de IGV para el desglose informativo. El precio al público ya incluye
// IGV (regla peruana de venta retail): la base se calcula hacia atrás y el
// cobro nunca cambia. Tasa 0 cubre ventas exoneradas.
export class IgvService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getRatePercent(): Promise<number> {
    const raw = await this.settingsRepository.get(IGV_KEY);
    if (raw === null) return DEFAULT_RATE;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed < 0 || parsed > MAX_RATE ? DEFAULT_RATE : parsed;
  }

  async setRatePercent(rate: number): Promise<number> {
    const bounded = Math.min(MAX_RATE, Math.max(0, Math.round(rate)));
    await this.settingsRepository.set(IGV_KEY, String(bounded));
    return bounded;
  }
}
