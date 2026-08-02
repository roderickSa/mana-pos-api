import type { Nullable } from '#shared/domain/nullable.js';
import type { ProductLot, ProductLotGroup } from '#modules/inventory/domain/product-lot.js';

export interface LotRepository {
  // Upsert: crear el lote o actualizar cantidad/fecha del existente.
  save(lot: ProductLot): Promise<void>;
  findById(id: string): Promise<Nullable<ProductLot>>;
  delete(id: string): Promise<void>;
  // Todos los lotes de productos activos, agrupados con nombre y stock actual
  // (la asignación por rotación necesita el conjunto completo de cada producto).
  listGroupsWithLots(): Promise<ProductLotGroup[]>;
}
