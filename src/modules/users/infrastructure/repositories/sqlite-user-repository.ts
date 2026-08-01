import { eq, sql } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { users } from '#shared/infrastructure/database/schema.js';
import { User } from '#modules/users/domain/user.js';
import type { UserRepository } from '#modules/users/ports/user-repository.js';

type UserRow = typeof users.$inferSelect;

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(user: User): Promise<void> {
    const row = {
      id: user.id,
      name: user.name,
      pinHash: user.pinHash,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
    await this.db.insert(users).values(row).onConflictDoUpdate({ target: users.id, set: row });
  }

  async findById(id: string): Promise<Nullable<User>> {
    const row = await this.db.query.users.findFirst({ where: eq(users.id, id) });
    return row === undefined ? null : toUser(row);
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db.select().from(users).orderBy(users.name);
    return rows.map(toUser);
  }

  async countUsers(): Promise<number> {
    const rows = await this.db.select({ value: sql<number>`COUNT(*)` }).from(users);
    return rows[0]?.value ?? 0;
  }
}

function toUser(row: UserRow): User {
  return new User(row.id, row.name, row.pinHash, row.role, row.active, row.createdAt, row.lastLoginAt);
}
