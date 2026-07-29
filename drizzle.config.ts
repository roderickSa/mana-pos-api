import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/shared/infrastructure/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './mana.sqlite',
  },
});
