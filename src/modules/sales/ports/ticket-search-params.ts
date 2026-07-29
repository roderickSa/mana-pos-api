import type { Nullable } from '#shared/domain/nullable.js';
import type { PaymentMethodName } from '#modules/sales/domain/sales-report.js';

export class TicketSearchParams {
  constructor(
    readonly from: Nullable<Date>,
    readonly to: Nullable<Date>,
    readonly method: Nullable<PaymentMethodName>,
    readonly status: Nullable<'charged' | 'voided'>,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
