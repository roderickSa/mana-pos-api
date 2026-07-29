import { createDatabaseClient, runMigrations } from '../src/shared/infrastructure/database/client.js';

const databasePath = process.argv[2];
if (databasePath === undefined) {
  throw new Error('Usage: tsx scripts/smoke-migrate.ts <database-path>');
}

const db = createDatabaseClient(databasePath);
runMigrations(db, './drizzle');
console.log('MIGRATIONS_OK');
