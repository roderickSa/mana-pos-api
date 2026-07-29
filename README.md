# Maná POS

Sistema local del minimarket **Maná**: POS táctil, inventario, fiado, caja por turnos.
Offline-first (SQLite local), el sistema dirige los periféricos (impresora ESC/POS,
cajón, lector de códigos HID, balanza serial).

## Arquitectura

Hexagonal por módulo (`src/modules/<modulo>/{domain,ports,use-cases,infrastructure}`),
DI manual en `src/bootstrap/`, validación zod solo en los bordes, dominio modelado con
clases y uniones discriminadas por `instanceof`.

| Módulo | Responsabilidad |
|---|---|
| `catalog` | Productos, precios (unidad y por kg), categorías, códigos de barras |
| `inventory` | Stock, movimientos (kardex), ajustes y mermas |
| `sales` | Tickets, líneas (incl. granel con balanza), pagos, voucher |
| `cash` | Caja, turnos, aperturas/cortes, retiros y gastos |
| `credit` | Clientes, fiado, límites, abonos |
| `users` | Usuarios, PIN, perfiles (encargado/cajera), auditoría |

Los periféricos son **puertos** del módulo que los usa (p. ej. `sales/ports/receipt-printer.ts`,
`sales/ports/scale-reader.ts`) con adapters en `infrastructure/devices/`.

## Comandos

- `npm run dev` — backend en modo watch
- `npm run typecheck` — `tsc --noEmit`
- `npx jest <spec>` — specs puntuales (nunca la suite completa en local)

Ver requerimientos completos en `../REQUERIMIENTOS.md`.
