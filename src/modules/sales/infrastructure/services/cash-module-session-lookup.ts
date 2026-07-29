import type { Nullable } from '#shared/domain/nullable.js';
import type { CashSessionRepository } from '#modules/cash/ports/cash-session-repository.js';
import type { CashSessionLookup } from '#modules/sales/ports/cash-session-lookup.js';

export class CashModuleSessionLookup implements CashSessionLookup {
  constructor(private readonly cashSessionRepository: CashSessionRepository) {}

  async openSessionId(): Promise<Nullable<string>> {
    const session = await this.cashSessionRepository.findOpen();
    return session === null ? null : session.id;
  }
}
