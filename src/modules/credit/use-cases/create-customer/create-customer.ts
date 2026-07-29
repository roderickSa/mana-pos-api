import type { Nullable } from '#shared/domain/nullable.js';
import type { IdGenerator } from '#shared/ports/id-generator.js';
import type { TimeManager } from '#shared/ports/time-manager.js';
import { Customer } from '#modules/credit/domain/customer.js';
import type { CustomerRepository } from '#modules/credit/ports/customer-repository.js';

export class CreateCustomerInput {
  constructor(
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly document: Nullable<string>,
    readonly creditLimitCents: number,
  ) {}
}

export class CreateCustomer {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly idGenerator: IdGenerator,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    const customer = new Customer(
      this.idGenerator.generate(),
      input.name,
      input.phone,
      input.document,
      input.creditLimitCents,
      this.timeManager.now(),
    );
    await this.customerRepository.save(customer);
    return customer;
  }
}
