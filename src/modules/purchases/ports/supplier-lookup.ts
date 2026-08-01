export interface SupplierLookup {
  exists(supplierId: string): Promise<boolean>;
}
