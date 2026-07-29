export type UserRole = 'manager' | 'cashier';

export class User {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly pinHash: string,
    readonly role: UserRole,
    readonly active: boolean,
    readonly createdAt: Date,
  ) {}

  isManager(): boolean {
    return this.role === 'manager';
  }
}
