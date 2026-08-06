import type { UserRole } from '#modules/users/domain/user.js';

export type RouteAccess = 'public' | UserRole;

type Rule = {
  method: '*' | 'GET' | 'POST' | 'PUT' | 'DELETE';
  pattern: RegExp;
  access: RouteAccess;
};

// Todo lo que empiece con estos prefijos es API y exige sesión (salvo regla
// pública explícita). Lo demás son los estáticos del front compilado.
const API_PREFIXES = [
  '/users',
  '/catalog',
  '/inventory',
  '/purchases',
  '/suppliers',
  '/sales',
  '/cash',
  '/customers',
  '/devices',
  '/settings',
  '/backups',
  '/health',
];

// La matriz de permisos del API, en UN solo lugar. Primera regla que calza
// gana; un endpoint nuevo sin regla queda cerrado a encargado por defecto.
const RULES: Rule[] = [
  { method: 'POST', pattern: /^\/users\/login$/, access: 'public' },
  // Logout siempre pasa: revocar un token ya muerto también es "salir".
  { method: 'POST', pattern: /^\/users\/logout$/, access: 'public' },
  { method: 'GET', pattern: /^\/health$/, access: 'public' },
  // Verificación de PIN de encargado (elevación puntual desde caja).
  { method: 'POST', pattern: /^\/users\/verify-manager$/, access: 'cashier' },
  // Administración de usuarios: encargado (el use case bloquea aparte que un
  // no-dueño cree o edite cuentas de dueño — sin auto-promoción).
  { method: '*', pattern: /^\/users/, access: 'manager' },
  // Lo técnico/sensible es del dueño (decisión de Roder 02-ago): respaldos.
  { method: '*', pattern: /^\/backups/, access: 'owner' },
  { method: '*', pattern: /^\/settings/, access: 'manager' },
  // Trastienda: encargado.
  { method: '*', pattern: /^\/inventory/, access: 'manager' },
  { method: '*', pattern: /^\/purchases/, access: 'manager' },
  { method: '*', pattern: /^\/suppliers/, access: 'manager' },
  // Precios masivos y sugerencias por margen: solo encargado (incluye GET).
  { method: '*', pattern: /^\/catalog\/prices/, access: 'manager' },
  // Catálogo: Vender necesita leerlo; administrarlo es de encargado.
  { method: 'GET', pattern: /^\/catalog/, access: 'cashier' },
  { method: '*', pattern: /^\/catalog/, access: 'manager' },
  // Dispositivos: el estado lo consulta la venta; configurarlos, el encargado.
  { method: 'GET', pattern: /^\/devices/, access: 'cashier' },
  { method: '*', pattern: /^\/devices/, access: 'manager' },
  // Anular una venta exige encargado (la UI además pide su PIN).
  { method: 'POST', pattern: /^\/sales\/tickets\/[^/]+\/void$/, access: 'manager' },
  // Operación de mostrador: cualquier sesión activa.
  { method: '*', pattern: /^\/(sales|cash|customers)/, access: 'cashier' },
];

export function resolveAccess(method: string, url: string): RouteAccess {
  const path = url.split('?')[0] ?? url;
  const isApi = API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!isApi) {
    return 'public';
  }
  for (const rule of RULES) {
    if ((rule.method === '*' || rule.method === method) && rule.pattern.test(path)) {
      return rule.access;
    }
  }
  return 'manager';
}
