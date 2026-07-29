import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '#shared/infrastructure/database/schema.js';

export type DatabaseClient = BetterSQLite3Database<typeof schema>;

export function createDatabaseClient(databasePath: string): DatabaseClient {
  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  return drizzle(sqlite, { schema });
}

export function runMigrations(client: DatabaseClient, migrationsFolder: string): void {
  migrate(client, { migrationsFolder });
}
