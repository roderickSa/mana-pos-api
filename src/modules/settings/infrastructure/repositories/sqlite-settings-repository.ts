import { eq } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { settings } from '#shared/infrastructure/database/schema.js';
import type { SettingsRepository } from '#modules/settings/ports/settings-repository.js';

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async get(key: string): Promise<Nullable<string>> {
    const row = await this.db.query.settings.findFirst({ where: eq(settings.key, key) });
    return row === undefined ? null : row.value;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
