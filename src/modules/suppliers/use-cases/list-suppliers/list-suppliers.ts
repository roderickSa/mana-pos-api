import type { Supplier } from '#modules/suppliers/domain/supplier.js';
import type { SupplierRepository } from '#modules/suppliers/ports/supplier-repository.js';

export class ListSuppliers {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(): Promise<Supplier[]> {
    return this.supplierRepository.findAll();
  }
}
