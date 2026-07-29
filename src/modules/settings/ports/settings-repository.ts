import type { Nullable } from '#shared/domain/nullable.js';

export interface SettingsRepository {
  get(key: string): Promise<Nullable<string>>;
  set(key: string, value: string): Promise<void>;
}
