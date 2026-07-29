import type { Nullable } from '#shared/domain/nullable.js';
import type { Supplier } from '#modules/suppliers/domain/supplier.js';

export interface SupplierRepository {
  save(supplier: Supplier): Promise<void>;
  findById(id: string): Promise<Nullable<Supplier>>;
  findAll(): Promise<Supplier[]>;
}
