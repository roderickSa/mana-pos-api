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
  lotExpiryDto,
  lotWasteDto,
  toMovementResponse,
} from '#modules/inventory/infrastructure/rest/dtos/inventory.dto.js';
import {
  GetExpiringLots,
  LotNotFoundById,
  LotRemoved,
  LotUpdated,
  RemoveLot,
  UpdateLotExpiry,
} from '#modules/inventory/use-cases/expiry/expiry.js';
import {
  RegisterLotWaste,
  RegisterLotWasteInput,
} from '#modules/inventory/use-cases/register-lot-waste/register-lot-waste.js';
import type { ExpiryAlertService } from '#modules/settings/use-cases/expiry-alert-service.js';
import { SearchMovements } from '#modules/inventory/use-cases/search-movements/search-movements.js';
import { SearchMovementsInput } from '#modules/inventory/use-cases/search-movements/search-movements.input.js';

export class InventoryController {
  constructor(
    private readonly registerStockEntry: RegisterStockEntry,
    private readonly registerStockAdjustment: RegisterStockAdjustment,
    private readonly setStockCount: SetStockCount,
    private readonly getKardex: GetKardex,
    private readonly searchMovements: SearchMovements,
    private readonly getExpiringLots: GetExpiringLots,
    private readonly updateLotExpiry: UpdateLotExpiry,
    private readonly removeLot: RemoveLot,
    private readonly registerLotWaste: RegisterLotWaste,
    private readonly expiryAlertService: ExpiryAlertService,
  ) {}

  async expiring(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const days = await this.expiryAlertService.getDays();
    const result = await this.getExpiringLots.execute(days);
    const now = new Date();
    await reply.status(200).send({
      alertDays: result.alertDays,
      items: result.items.map((item) => ({
        lotId: item.lotId,
        productId: item.productId,
        name: item.name,
        saleType: item.saleType,
        quantity: item.remainingQuantity,
        expiryDate: item.expiryDate.toISOString(),
        receivedAt: item.receivedAt.toISOString(),
        daysLeft: item.daysLeft(now),
      })),
    });
  }

  async updateLot(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = lotExpiryDto.parse(request.body);
    const result = await this.updateLotExpiry.execute(
      lotIdParam(request),
      new Date(`${body.expiryDate}T12:00:00`),
    );
    if (result instanceof LotNotFoundById) {
      await reply.status(404).send({ code: 'LOT_NOT_FOUND', lotId: result.lotId });
      return;
    }
    if (result instanceof LotUpdated) {
      await reply.status(200).send({ ok: true });
      return;
    }
    exhaustive(result);
  }

  async deleteLot(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.removeLot.execute(lotIdParam(request));
    if (result instanceof LotNotFoundById) {
      await reply.status(404).send({ code: 'LOT_NOT_FOUND', lotId: result.lotId });
      return;
    }
    if (result instanceof LotRemoved) {
      await reply.status(200).send({ ok: true });
      return;
    }
    exhaustive(result);
  }

  async lotWaste(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = lotWasteDto.parse(request.body);
    const userId = request.authUser === null ? 'encargado' : request.authUser.name;
    const result = await this.registerLotWaste.execute(
      new RegisterLotWasteInput(lotIdParam(request), body.quantity, userId),
    );
    if (result instanceof StockAdjusted) {
      await reply.status(201).send(toMovementResponse(result.movement));
      return;
    }
    if (result instanceof LotNotFoundById) {
      await reply.status(404).send({ code: 'LOT_NOT_FOUND', lotId: result.lotId });
      return;
    }
    if (result instanceof ProductNotFoundInInventory) {
      await reply.status(404).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
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
    exhaustive(result);
  }

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

  // Mismo criterio que el export de Ventas: los filtros vigentes, hasta
  // 10000 filas, en CSV legible por Excel.
  async exportMovementsCsv(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = searchMovementsDto.parse(request.query);
    const result = await this.searchMovements.execute(
      new SearchMovementsInput(
        query.query ?? null,
        query.kind ?? null,
        query.from === undefined ? null : new Date(`${query.from}T00:00:00`),
        query.to === undefined ? null : new Date(`${query.to}T23:59:59.999`),
        10000,
        0,
      ),
    );
    const header = 'fecha,hora,producto,tipo,cantidad,valor_soles,usuario,motivo';
    const rows = result.items.map((item) => {
      const movement = item.movement;
      const fecha = movement.createdAt.toLocaleDateString('es-PE');
      const hora = movement.createdAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const tipo = MOVEMENT_KIND_CSV[movement.kind] ?? movement.kind;
      const valor = movement.valueCents === null ? '' : (movement.valueCents / 100).toFixed(2);
      const campos = [item.productName, tipo, movement.userId, movement.reason ?? ''].map(csvField);
      return `${fecha},${hora},${campos[0]},${campos[1]},${movement.quantity},${valor},${campos[2]},${campos[3]}`;
    });
    const csv = `﻿${header}\n${rows.join('\n')}\n`;

    await reply
      .status(200)
      .header('content-disposition', 'attachment; filename="kardex-mana.csv"')
      .type('text/csv; charset=utf-8')
      .send(csv);
  }

  async entry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = registerEntryDto.parse(request.body);
    const result = await this.registerStockEntry.execute(
      new RegisterStockEntryInput(
        body.productId,
        body.quantity,
        body.userId,
        body.unitCostCents ?? null,
        body.expiryDate == null ? null : new Date(`${body.expiryDate}T12:00:00`),
      ),
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
        movements: result.entries.map((entry) => ({
          ...toMovementResponse(entry.movement),
          balanceAfter: entry.balanceAfter,
        })),
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

const MOVEMENT_KIND_CSV: Record<string, string> = {
  sale: 'venta',
  sale_reversal: 'devolución por anulación',
  purchase: 'entrada',
  waste: 'merma',
  expiry: 'vencimiento',
  theft: 'robo/pérdida',
  count: 'conteo',
  refund: 'devolución',
};

// Campos con comas o comillas van entre comillas (regla CSV estándar).
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function lotIdParam(request: FastifyRequest): string {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return params.id;
  }
  throw new Error('Missing lot id param');
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
