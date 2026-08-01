import type { Nullable } from '#shared/domain/nullable.js';
import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

export class SettingsRepositoryForTesting implements SettingsRepository {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<Nullable<string>> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}
