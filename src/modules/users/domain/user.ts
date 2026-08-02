import type { Nullable } from '#shared/domain/nullable.js';

export type UserRole = 'owner' | 'manager' | 'cashier';

// Jerarquía: el dueño puede todo lo del encargado, el encargado todo lo de
// la cajera. Los chequeos de permiso van SIEMPRE por hasAtLeast, nunca por
// comparación de strings — así agregar un rol no rompe los gates existentes.
const ROLE_RANK: Record<UserRole, number> = { owner: 3, manager: 2, cashier: 1 };

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

  hasAtLeast(role: UserRole): boolean {
    return ROLE_RANK[this.role] >= ROLE_RANK[role];
  }

  isOwner(): boolean {
    return this.role === 'owner';
  }

  isManager(): boolean {
    return this.hasAtLeast('manager');
  }

  withLastLogin(at: Date): User {
    return new User(this.id, this.name, this.pinHash, this.role, this.active, this.createdAt, at);
  }
}
