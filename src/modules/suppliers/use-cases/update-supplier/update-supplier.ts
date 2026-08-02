import { Supplier } from '#modules/suppliers/domain/supplier.js';
import type { SupplierRepository } from '#modules/suppliers/ports/supplier-repository.js';
import type { UpdateSupplierInput } from '#modules/suppliers/use-cases/update-supplier/update-supplier.input.js';

export class SupplierUpdated {
  constructor(readonly supplier: Supplier) {}
}

export class SupplierNotFoundById {
  constructor(readonly supplierId: string) {}
}

export type UpdateSupplierResult = SupplierUpdated | SupplierNotFoundById;

export class UpdateSupplier {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(input: UpdateSupplierInput): Promise<UpdateSupplierResult> {
    const existing = await this.supplierRepository.findById(input.id);
    if (existing === null) {
      return new SupplierNotFoundById(input.id);
    }
    const updated = new Supplier(
      existing.id,
      input.name,
      input.phone,
      input.notes,
      input.visitDays,
      input.contactName,
      input.paymentTerms,
      input.active,
      existing.createdAt,
    );
    await this.supplierRepository.save(updated);
    return new SupplierUpdated(updated);
  }
}
