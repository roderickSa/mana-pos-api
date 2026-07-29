import type { Nullable } from '#shared/domain/nullable.js';

export class CreateSupplierInput {
  constructor(
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly notes: Nullable<string>,
  ) {}
}
