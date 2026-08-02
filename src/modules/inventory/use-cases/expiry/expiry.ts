import type { TimeManager } from '#shared/ports/time-manager.js';
import {
  ExpiringLot,
  remainingPerLot,
  type ProductLot,
} from '#modules/inventory/domain/product-lot.js';
import type { LotRepository } from '#modules/inventory/ports/lot-repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export class ExpiringList {
  constructor(
    readonly alertDays: number,
    readonly items: ExpiringLot[],
  ) {}
}

// Vencidos y por vencer dentro de la ventana de alerta, LOTE por LOTE: cada
// entrada tiene su propia fecha, y la alerta muestra solo lo que queda de
// cada una según la rotación (lo más próximo a vencer se vende primero).
export class GetExpiringLots {
  constructor(
    private readonly lotRepository: LotRepository,
    private readonly timeManager: TimeManager,
  ) {}

  async execute(alertDays: number): Promise<ExpiringList> {
    const limit = new Date(this.timeManager.now().getTime() + alertDays * DAY_MS);
    const groups = await this.lotRepository.listGroupsWithLots();
    const items: ExpiringLot[] = [];
    for (const group of groups) {
      for (const { lot, remaining } of remainingPerLot(group)) {
        if (remaining > 0 && lot.expiryDate.getTime() <= limit.getTime()) {
          items.push(
            new ExpiringLot(
              lot.id,
              group.productId,
              group.name,
              group.saleType,
              remaining,
              lot.expiryDate,
              lot.createdAt,
            ),
          );
        }
      }
    }
    items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    return new ExpiringList(alertDays, items);
  }
}

export class LotNotFoundById {
  constructor(readonly lotId: string) {}
}

export class LotUpdated {
  constructor(readonly lot: ProductLot) {}
}

export class LotRemoved {}

export class UpdateLotExpiry {
  constructor(private readonly lotRepository: LotRepository) {}

  async execute(lotId: string, expiryDate: Date): Promise<LotUpdated | LotNotFoundById> {
    const lot = await this.lotRepository.findById(lotId);
    if (lot === null) {
      return new LotNotFoundById(lotId);
    }
    const updated = lot.withExpiry(expiryDate);
    await this.lotRepository.save(updated);
    return new LotUpdated(updated);
  }
}

// Quitar el lote de la alerta (p. ej. la fecha estaba mal capturada). No
// toca stock: para dar de baja mercadería está la merma.
export class RemoveLot {
  constructor(private readonly lotRepository: LotRepository) {}

  async execute(lotId: string): Promise<LotRemoved | LotNotFoundById> {
    const lot = await this.lotRepository.findById(lotId);
    if (lot === null) {
      return new LotNotFoundById(lotId);
    }
    await this.lotRepository.delete(lotId);
    return new LotRemoved();
  }
}
