import type { Nullable } from '#shared/domain/nullable.js';
import type { CashBreakdown, CashSession } from '#modules/cash/domain/cash-session.js';
import type { MethodTotal } from '#modules/cash/ports/cash-inflow-source.js';

export class CloseSummary {
  constructor(
    readonly session: CashSession,
    readonly breakdown: CashBreakdown,
    readonly salesByMethod: MethodTotal[],
  ) {}

  get differenceCents(): number {
    return (this.session.countedCashCents ?? 0) - (this.session.expectedCashCents ?? 0);
  }
}

export interface CloseSummaryPrinter {
  // Devuelve null si imprimió; si la impresora falló, un mensaje en humano.
  printCloseSummary(summary: CloseSummary): Promise<Nullable<string>>;
}
