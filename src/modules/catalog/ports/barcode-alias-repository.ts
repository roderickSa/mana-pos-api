import type { Nullable } from '#shared/domain/nullable.js';

// Códigos de barras adicionales de un producto (el principal vive en el
// propio producto). Escanear cualquiera vende el mismo producto.
export interface BarcodeAliasRepository {
  listByProduct(productId: string): Promise<string[]>;
  ownerOf(barcode: string): Promise<Nullable<string>>;
  add(productId: string, barcode: string, at: Date): Promise<void>;
  remove(productId: string, barcode: string): Promise<void>;
}
