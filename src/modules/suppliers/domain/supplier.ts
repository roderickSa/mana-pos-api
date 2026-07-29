import type { Nullable } from '#shared/domain/nullable.js';

export class Supplier {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly phone: Nullable<string>,
    readonly notes: Nullable<string>,
    readonly active: boolean,
    readonly createdAt: Date,
  ) {}
}
