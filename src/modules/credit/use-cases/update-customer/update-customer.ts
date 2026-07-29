import type { Nullable } from '#shared/domain/nullable.js';
import { Customer } from '#modules/credit/domain/customer.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

export class UpdateCustomerInput {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly document: Nullable<string>,
    readonly creditLimitCents: number,
  ) {}
}

export class CustomerUpdated {
  constructor(readonly customer: Customer) {}
}

export class CustomerNotFoundById {
  constructor(readonly customerId: string) {}
}

export type UpdateCustomerResult = CustomerUpdated | CustomerNotFoundById;

export class UpdateCustomer {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<UpdateCustomerResult> {
    const existing = await this.customerRepository.findById(input.id);
    if (existing === null) {
      return new CustomerNotFoundById(input.id);
    }
    const updated = new Customer(
      existing.id,
      input.name,
      input.phone,
      input.document,
      input.creditLimitCents,
      existing.createdAt,
    );
    await this.customerRepository.save(updated);
    return new CustomerUpdated(updated);
  }
}
