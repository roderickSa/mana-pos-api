import type { Nullable } from '#shared/domain/nullable.js';
import type { ExpiringProduct } from '#modules/inventory/domain/expiring-product.js';
import type { ProductStock } from '#modules/inventory/domain/product-stock.js';
import type { StockMovement } from '#modules/inventory/domain/stock-movement.js';
import type { StockMovementPage } from '#modules/inventory/domain/stock-movement-page.js';
import type { MovementSearchParams } from '#modules/inventory/ports/movement-search-params.js';

export interface InventoryRepository {
  getStock(productId: string): Promise<Nullable<ProductStock>>;
  // Aplica los movimientos y sus deltas de stock de forma atómica.
  applyMovements(movements: StockMovement[]): Promise<void>;
  // Costo de última compra: actualiza el costo vigente del producto.
  setProductCost(productId: string, costCents: number): Promise<void>;
  // Fecha de vencimiento del stock actual (null la limpia).
  setProductExpiry(productId: string, expiryDate: Nullable<Date>): Promise<void>;
  // Productos activos con vencimiento antes de la fecha dada.
  listExpiring(before: Date): Promise<ExpiringProduct[]>;
  findMovementsByTicketId(ticketId: string): Promise<StockMovement[]>;
  findMovementsByProductId(productId: string): Promise<StockMovement[]>;
  // Kardex general: histórico paginado con filtros.
  searchMovements(params: MovementSearchParams): Promise<StockMovementPage>;
}
