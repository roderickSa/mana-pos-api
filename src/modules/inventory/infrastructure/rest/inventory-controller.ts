import type { FastifyReply, FastifyRequest } from 'fastify';

import { exhaustive } from '#shared/domain/exhaustive.js';
import { GetKardex } from '#modules/inventory/use-cases/get-kardex/get-kardex.js';
import { GetKardexInput } from '#modules/inventory/use-cases/get-kardex/get-kardex.input.js';
import { KardexFound } from '#modules/inventory/use-cases/get-kardex/get-kardex.output.js';
import { RegisterStockAdjustment } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.js';
import { RegisterStockAdjustmentInput } from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.input.js';
import {
  AdjustmentExceedsStock,
  StockAdjusted,
} from '#modules/inventory/use-cases/register-stock-adjustment/register-stock-adjustment.output.js';
import { RegisterStockEntry } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.js';
import { RegisterStockEntryInput } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.input.js';
import {
  ProductNotFoundInInventory,
  StockEntryRegistered,
} from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.output.js';
import { SetStockCount } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.js';
import { SetStockCountInput } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.input.js';
import { StockCountRegistered } from '#modules/inventory/use-cases/set-stock-count/set-stock-count.output.js';
import {
  registerAdjustmentDto,
  registerEntryDto,
  searchMovementsDto,
  setCountDto,
  toMovementResponse,
} from '#modules/inventory/infrastructure/rest/dtos/inventory.dto.js';
import { SearchMovements } from '#modules/inventory/use-cases/search-movements/search-movements.js';
import { SearchMovementsInput } from '#modules/inventory/use-cases/search-movements/search-movements.input.js';

export class InventoryController {
  constructor(
    private readonly registerStockEntry: RegisterStockEntry,
    private readonly registerStockAdjustment: RegisterStockAdjustment,
    private readonly setStockCount: SetStockCount,
    private readonly getKardex: GetKardex,
    private readonly searchMovements: SearchMovements,
  ) {}

  async movements(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = searchMovementsDto.parse(request.query);
    const perPage = query.perPage ?? 25;
    const page = query.page ?? 1;
    const result = await this.searchMovements.execute(
      new SearchMovementsInput(
        query.query ?? null,
        query.kind ?? null,
        query.from === undefined ? null : new Date(`${query.from}T00:00:00`),
        query.to === undefined ? null : new Date(`${query.to}T23:59:59.999`),
        perPage,
        (page - 1) * perPage,
      ),
    );
    await reply.status(200).send({
      items: result.items.map((item) => ({
        ...toMovementResponse(item.movement),
        productName: item.productName,
      })),
      total: result.total,
      page,
      perPage,
    });
  }

  async entry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = registerEntryDto.parse(request.body);
    const result = await this.registerStockEntry.execute(
      new RegisterStockEntryInput(body.productId, body.quantity, body.userId),
    );

    if (result instanceof StockEntryRegistered) {
      await reply.status(201).send(toMovementResponse(result.movement));
      return;
    }
    if (result instanceof ProductNotFoundInInventory) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }

  async adjustment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = registerAdjustmentDto.parse(request.body);
    const result = await this.registerStockAdjustment.execute(
      new RegisterStockAdjustmentInput(
        body.productId,
        body.kind,
        body.quantity,
        body.reason ?? null,
        body.userId,
      ),
    );

    if (result instanceof StockAdjusted) {
      await reply.status(201).send(toMovementResponse(result.movement));
      return;
    }
    if (result instanceof AdjustmentExceedsStock) {
      await reply.status(409).send({
        code: 'ADJUSTMENT_EXCEEDS_STOCK',
        productId: result.productId,
        availableQuantity: result.availableQuantity,
        requestedQuantity: result.requestedQuantity,
      });
      return;
    }
    if (result instanceof ProductNotFoundInInventory) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }

  async count(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = setCountDto.parse(request.body);
    const result = await this.setStockCount.execute(
      new SetStockCountInput(body.productId, body.countedQuantity, body.userId),
    );

    if (result instanceof StockCountRegistered) {
      await reply.status(201).send({
        productId: result.productId,
        difference: result.difference,
        movement: result.movement === null ? null : toMovementResponse(result.movement),
      });
      return;
    }
    if (result instanceof ProductNotFoundInInventory) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }

  async kardex(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const productId = productIdParam(request);
    const result = await this.getKardex.execute(new GetKardexInput(productId));

    if (result instanceof KardexFound) {
      await reply.status(200).send({
        productId: result.productId,
        currentQuantity: result.currentQuantity,
        movements: result.movements.map(toMovementResponse),
      });
      return;
    }
    if (result instanceof ProductNotFoundInInventory) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    exhaustive(result);
  }
}

function productIdParam(request: FastifyRequest): string {
  const params = request.params;
  if (
    typeof params === 'object' &&
    params !== null &&
    'productId' in params &&
    typeof params.productId === 'string'
  ) {
    return params.productId;
  }
  throw new Error('Missing productId param');
}
