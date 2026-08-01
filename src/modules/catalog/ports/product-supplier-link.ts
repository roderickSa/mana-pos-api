// Asociación dirigida producto↔proveedor, para gestionarla desde el lado del
// proveedor sin re-guardar el producto completo.
export interface ProductSupplierLink {
  link(productId: string, supplierId: string): Promise<void>;
  unlink(productId: string, supplierId: string): Promise<void>;
}
