import { resolveAccess } from '#modules/users/infrastructure/rest/route-policy.js';

describe('route policy', () => {
  it('keeps login, logout, health and front statics public', () => {
    expect(resolveAccess('POST', '/users/login')).toBe('public');
    expect(resolveAccess('POST', '/users/logout')).toBe('public');
    expect(resolveAccess('GET', '/health')).toBe('public');
    expect(resolveAccess('GET', '/')).toBe('public');
    expect(resolveAccess('GET', '/assets/index-abc.js')).toBe('public');
    expect(resolveAccess('GET', '/images/producto.webp')).toBe('public');
  });

  it('reserves the technical/sensitive endpoints for the owner', () => {
    expect(resolveAccess('GET', '/backups/status')).toBe('owner');
    expect(resolveAccess('POST', '/backups/run')).toBe('owner');
    expect(resolveAccess('PUT', '/backups/external-dir')).toBe('owner');
  });

  it('gives the back office to managers (owner ve lo mismo por jerarquía)', () => {
    expect(resolveAccess('POST', '/inventory/entries')).toBe('manager');
    expect(resolveAccess('GET', '/purchases/orders')).toBe('manager');
    expect(resolveAccess('PUT', '/catalog/products/p1')).toBe('manager');
    expect(resolveAccess('POST', '/sales/tickets/t1/void')).toBe('manager');
    expect(resolveAccess('PUT', '/settings/igv')).toBe('manager');
    expect(resolveAccess('PUT', '/settings/receipt')).toBe('manager');
    expect(resolveAccess('PUT', '/devices/scale')).toBe('manager');
    expect(resolveAccess('GET', '/users')).toBe('manager');
    expect(resolveAccess('POST', '/users')).toBe('manager');
    expect(resolveAccess('PUT', '/users/u1')).toBe('manager');
  });

  it('lets any active session run the counter', () => {
    expect(resolveAccess('GET', '/catalog/products?query=leche')).toBe('cashier');
    expect(resolveAccess('POST', '/sales/tickets')).toBe('cashier');
    expect(resolveAccess('POST', '/cash/movements')).toBe('cashier');
    expect(resolveAccess('GET', '/customers')).toBe('cashier');
    expect(resolveAccess('GET', '/devices/status')).toBe('cashier');
    expect(resolveAccess('POST', '/users/verify-manager')).toBe('cashier');
  });

  it('closes unknown API endpoints to managers by default', () => {
    expect(resolveAccess('DELETE', '/inventory/whatever')).toBe('manager');
    expect(resolveAccess('PATCH', '/catalog/nuevo-endpoint')).toBe('manager');
  });
});
