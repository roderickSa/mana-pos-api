import type { Nullable } from '#shared/domain/nullable.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';
import type { CustomerNameLookup } from '#modules/sales/ports/customer-name-lookup.js';

// Adapter: los clientes viven en el módulo credit (la libreta de fiados
// creció a libreta de clientes).
export class CreditModuleCustomerNames implements CustomerNameLookup {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async nameOf(customerId: string): Promise<Nullable<string>> {
    const customer = await this.customerRepository.findById(customerId);
    return customer?.name ?? null;
  }
}
