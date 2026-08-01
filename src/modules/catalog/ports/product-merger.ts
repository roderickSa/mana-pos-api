// Fusiona el producto duplicado (loser) dentro del maestro (winner): suma
// stock, repunta kardex/tickets/órdenes, une proveedores y códigos, y borra
// el duplicado. La validación de negocio vive en el use case.
export interface ProductMerger {
  merge(winnerId: string, loserId: string, at: Date): Promise<void>;
}
