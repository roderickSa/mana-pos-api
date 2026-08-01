import type { Nullable } from '#shared/domain/nullable.js';

export type UserRole = 'manager' | 'cashier';

export class User {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly pinHash: string,
    readonly role: UserRole,
    readonly active: boolean,
    readonly createdAt: Date,
    readonly lastLoginAt: Nullable<Date>,
  ) {}

  isManager(): boolean {
    return this.role === 'manager';
  }

  withLastLogin(at: Date): User {
    return new User(this.id, this.name, this.pinHash, this.role, this.active, this.createdAt, at);
  }
}
