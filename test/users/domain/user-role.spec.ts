import { User } from '#modules/users/domain/user.js';
import type { UserRole } from '#modules/users/domain/user.js';

function userWithRole(role: UserRole): User {
  return new User('u1', 'Prueba', 'hash', role, true, new Date('2026-08-02T10:00:00Z'), null);
}

describe('User role hierarchy', () => {
  it('owner passes every gate', () => {
    const owner = userWithRole('owner');
    expect(owner.isOwner()).toBe(true);
    expect(owner.isManager()).toBe(true);
    expect(owner.hasAtLeast('cashier')).toBe(true);
  });

  it('manager passes manager gates but not owner gates', () => {
    const manager = userWithRole('manager');
    expect(manager.isOwner()).toBe(false);
    expect(manager.isManager()).toBe(true);
    expect(manager.hasAtLeast('owner')).toBe(false);
  });

  it('cashier only passes cashier gates', () => {
    const cashier = userWithRole('cashier');
    expect(cashier.isManager()).toBe(false);
    expect(cashier.hasAtLeast('cashier')).toBe(true);
  });
});
