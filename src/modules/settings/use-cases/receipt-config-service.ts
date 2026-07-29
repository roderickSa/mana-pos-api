import { z } from 'zod';

import type { Nullable } from '#shared/domain/nullable.js';
import { ReceiptConfig } from '#modules/settings/domain/receipt-config.js';
import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

const RECEIPT_KEY = 'receipt-config';

const storedDto = z.object({
  storeName: z.string().min(1),
  headerExtra: z.string().nullable(),
  footerMessage: z.string().min(1),
});

export class UpdateReceiptConfigInput {
  constructor(
    readonly storeName: string,
    readonly headerExtra: Nullable<string>,
    readonly footerMessage: string,
  ) {}
}

export class ReceiptConfigService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async get(): Promise<ReceiptConfig> {
    const raw = await this.settingsRepository.get(RECEIPT_KEY);
    if (raw === null) {
      return ReceiptConfig.defaults();
    }
    try {
      const parsed = storedDto.parse(JSON.parse(raw));
      return new ReceiptConfig(parsed.storeName, parsed.headerExtra, parsed.footerMessage);
    } catch {
      return ReceiptConfig.defaults();
    }
  }

  async update(input: UpdateReceiptConfigInput): Promise<ReceiptConfig> {
    const config = new ReceiptConfig(input.storeName, input.headerExtra, input.footerMessage);
    await this.settingsRepository.set(
      RECEIPT_KEY,
      JSON.stringify({
        storeName: config.storeName,
        headerExtra: config.headerExtra,
        footerMessage: config.footerMessage,
      }),
    );
    return config;
  }
}
