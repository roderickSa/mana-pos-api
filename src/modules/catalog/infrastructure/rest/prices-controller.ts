import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type { Nullable } from '#shared/domain/nullable.js';
import { dimeCents } from '#shared/infrastructure/rest/money.dto.js';
import type { PriceChange } from '#modules/catalog/domain/price-change.js';
import { PriceUpdate } from '#modules/catalog/ports/product-repository.js';
import { BulkUpdatePrices } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.js';
import { BulkUpdatePricesInput } from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.input.js';
import {
  NoProductsToUpdate,
  PriceChangesPreviewed,
  PricesApplied,
} from '#modules/catalog/use-cases/bulk-update-prices/bulk-update-prices.output.js';
import {
  SuggestLowMarginPrices,
  SuggestLowMarginPricesInput,
} from '#modules/catalog/use-cases/suggest-low-margin-prices/suggest-low-margin-prices.js';
import {
  ApplyPriceList,
  ApplyPriceListInput,
  EmptyPriceList,
  PriceListApplied,
  ProductNotFoundInPriceList,
} from '#modules/catalog/use-cases/apply-price-list/apply-price-list.js';

const bulkDto = z.object({
  category: z.string().min(1).nullish(),
  supplierId: z.string().min(1).nullish(),
  mode: z.enum(['percent', 'amount']),
  // percent admite decimales (p. ej. 2.5); amount va en céntimos enteros.
  value: z.number().finite().refine((value) => value !== 0, 'El cambio no puede ser 0.'),
});

const lowMarginQueryDto = z.object({
  threshold: z.coerce.number().positive().max(90).default(20),
});

const priceListDto = z.object({
  updates: z
    .array(z.object({ productId: z.string().min(1), priceCents: dimeCents(z.number().int().min(10)) }))
    .min(1)
    .max(10000),
});

function round1(value: Nullable<number>): Nullable<number> {
  return value === null ? null : Math.round(value * 10) / 10;
}

function toChangeResponse(change: PriceChange): Record<string, unknown> {
  return {
    productId: change.productId,
    name: change.name,
    saleType: change.saleType,
    costCents: change.costCents,
    oldPriceCents: change.oldPriceCents,
    newPriceCents: change.newPriceCents,
    oldMarginPercent: round1(change.oldMarginPercent),
    newMarginPercent: round1(change.newMarginPercent),
  };
}

export class PricesController {
  constructor(
    private readonly bulkUpdatePrices: BulkUpdatePrices,
    private readonly suggestLowMarginPrices: SuggestLowMarginPrices,
    private readonly applyPriceList: ApplyPriceList,
  ) {}

  async preview(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await this.runBulk(request, reply, false);
  }

  async apply(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await this.runBulk(request, reply, true);
  }

  private async runBulk(request: FastifyRequest, reply: FastifyReply, apply: boolean): Promise<void> {
    const body = bulkDto.parse(request.body);
    const result = await this.bulkUpdatePrices.execute(
      new BulkUpdatePricesInput(
        body.category ?? null,
        body.supplierId ?? null,
        body.mode,
        body.mode === 'amount' ? Math.round(body.value) : body.value,
        apply,
      ),
    );

    if (result instanceof PriceChangesPreviewed || result instanceof PricesApplied) {
      await reply.status(200).send({
        applied: result instanceof PricesApplied,
        changes: result.changes.map((change) => toChangeResponse(change)),
      });
      return;
    }
    if (result instanceof NoProductsToUpdate) {
      await reply.status(200).send({ applied: false, changes: [] });
      return;
    }
    exhaustive(result);
  }

  async lowMargin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = lowMarginQueryDto.parse(request.query);
    const result = await this.suggestLowMarginPrices.execute(
      new SuggestLowMarginPricesInput(query.threshold),
    );
    await reply.status(200).send({
      thresholdPercent: query.threshold,
      items: result.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        saleType: item.saleType,
        costCents: item.costCents,
        priceCents: item.priceCents,
        marginPercent: round1(item.marginPercent),
        suggestedPriceCents: item.suggestedPriceCents,
        suggestedMarginPercent: round1(item.suggestedMarginPercent),
      })),
    });
  }

  async applyList(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = priceListDto.parse(request.body);
    const result = await this.applyPriceList.execute(
      new ApplyPriceListInput(
        body.updates.map((update) => new PriceUpdate(update.productId, update.priceCents)),
      ),
    );

    if (result instanceof PriceListApplied) {
      await reply.status(200).send({ applied: result.count });
      return;
    }
    if (result instanceof ProductNotFoundInPriceList) {
      await reply.status(422).send({
        code: 'PRODUCT_NOT_FOUND',
        productId: result.productId,
        message: 'Un producto de la lista ya no existe. Vuelve a cargar las sugerencias.',
      });
      return;
    }
    if (result instanceof EmptyPriceList) {
      await reply.status(400).send({ code: 'EMPTY_PRICE_LIST', message: 'No hay precios que aplicar.' });
      return;
    }
    exhaustive(result);
  }
}
