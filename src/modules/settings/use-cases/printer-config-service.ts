import { z } from 'zod';

import type { Nullable } from '#shared/domain/nullable.js';
import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

const PRINTER_KEY = 'printer-config';

// zod aquí parsea JSON persistido por nosotros mismos (misma excepción
// aceptada que receipt-config).
const storedDto = z.object({
  printerName: z.string().nullable(),
  paperWidthMm: z.union([z.literal(58), z.literal(80)]),
});

export class PrinterConfig {
  constructor(
    // Nombre de la impresora del sistema (Windows); null = la de la variable
    // de entorno / auto.
    readonly printerName: Nullable<string>,
    readonly paperWidthMm: 58 | 80,
  ) {}
}

export class PrinterConfigService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly defaultWidthMm: 58 | 80,
  ) {}

  async get(): Promise<PrinterConfig> {
    const raw = await this.settingsRepository.get(PRINTER_KEY);
    if (raw === null) {
      return new PrinterConfig(null, this.defaultWidthMm);
    }
    try {
      const parsed = storedDto.parse(JSON.parse(raw));
      return new PrinterConfig(parsed.printerName, parsed.paperWidthMm);
    } catch {
      return new PrinterConfig(null, this.defaultWidthMm);
    }
  }

  async update(printerName: Nullable<string>, paperWidthMm: 58 | 80): Promise<PrinterConfig> {
    const config = new PrinterConfig(printerName, paperWidthMm);
    await this.settingsRepository.set(
      PRINTER_KEY,
      JSON.stringify({ printerName: config.printerName, paperWidthMm: config.paperWidthMm }),
    );
    return config;
  }
}
