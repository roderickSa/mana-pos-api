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
| `catalog` | Productos, precios (unidad y por kg), precios masivos y sugerencias por margen, categorías (orden/ícono/color), códigos de barras, import/export Excel |
| `inventory` | Stock, kardex con saldo acumulado, entradas, ajustes/mermas, lotes con vencimiento |
| `sales` | Tickets, líneas (incl. granel con balanza), descuentos, pagos, anulación, devoluciones, voucher |
| `cash` | Caja por turnos, aperturas/cortes a ciegas, retiros/gastos/depósitos, corte Z |
| `credit` | Clientes, fiado, límites, abonos, estado de cuenta |
| `purchases` | Órdenes de compra, recepción total/parcial, costo de última compra |
| `users` | Usuarios, PIN, roles (dueño/encargado/cajera), sesiones con token, matriz de rutas |
| `settings` | Config del voucher, impresora/papel, IGV referencial, alertas de vencimiento |
| `devices` | Impresoras del sistema, prueba de impresión, cajón, balanza |
| `backups` | Backup diario local + carpeta externa |

Los periféricos son **puertos** del módulo que los usa (p. ej. `sales/ports/receipt-printer.ts`,
`sales/ports/scale-reader.ts`) con adapters en `infrastructure/devices/`.

**Dinero (regla crítica)**: las líneas se calculan EXACTAS al céntimo y el
redondeo real a S/ 0.10 se aplica UNA sola vez sobre el total del ticket
(`shared/domain/dime.ts`). Todo monto físico digitado se valida en pasos de
10 céntimos (`shared/infrastructure/rest/money.dto.ts`). Los costos quedan exactos.

## Comandos

- `npm run dev` — backend en modo watch (puerto 3210; sirve el front si existe `../mana-pos-web/dist`)
- `npx tsc` — typecheck
- `npm test` — suite completa (~190 specs, <6 s); `npm test -- <patrón>` para una parte
- `npx tsx scripts/smoke-migrate.ts <ruta-db>` — migraciones sobre BD fresca
- `npx tsx scripts/seed-carga-1000.ts` — carga de prueba (~1000 productos, 25 clientes, 100 ventas) con la API corriendo

## Documentación

- `docs/GUIA-INSTALACION-TIENDA.md` — instalación en la PC de la tienda (Windows)
- `docs/MANUAL-DE-USO.md` — manual de operación (cajera y encargado)
- `docs/kiosco-windows.md` — modo kiosko de la pantalla táctil
- `docs/restauracion.md` — restaurar desde un backup
- `docs/REQUERIMIENTOS.md` — requerimientos del sistema
