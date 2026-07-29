import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { Supplier } from '#modules/suppliers/domain/supplier.js';
import type { SupplierRepository } from '#modules/suppliers/ports/supplier-repository.js';
import type { CreateSupplierInput } from '#modules/suppliers/use-cases/create-supplier/create-supplier.input.js';

export class CreateSupplier {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreateSupplierInput): Promise<Supplier> {
    const supplier = new Supplier(
      this.idGenerator.generate(),
      input.name,
      input.phone,
      input.notes,
      true,
      this.timeManager.now(),
    );
    await this.supplierRepository.save(supplier);
    return supplier;
  }
}
