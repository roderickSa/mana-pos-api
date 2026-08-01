import type { SupplierLookup } from '#modules/purchases/ports/supplier-lookup.js';

export class SupplierLookupForTesting implements SupplierLookup {
  private readonly supplierIds = new Set<string>();

  addSupplier(id: string): void {
    this.supplierIds.add(id);
  }

  async exists(supplierId: string): Promise<boolean> {
    return this.supplierIds.has(supplierId);
  }
}
