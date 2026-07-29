import type { SupplierLookup } from '#modules/catalog/ports/supplier-lookup.js';

export class SupplierLookupForTesting implements SupplierLookup {
  private readonly ids = new Set<string>();

  addSupplier(id: string): void {
    this.ids.add(id);
  }

  async exists(supplierId: string): Promise<boolean> {
    return this.ids.has(supplierId);
  }
}
