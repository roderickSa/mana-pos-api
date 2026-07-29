import type { Nullable } from '#shared/domain/nullable.js';
import type { Customer } from '#modules/credit/domain/customer.js';

export interface CustomerRepository {
  save(customer: Customer): Promise<void>;
  findById(id: string): Promise<Nullable<Customer>>;
  search(query: Nullable<string>): Promise<Customer[]>;
}
