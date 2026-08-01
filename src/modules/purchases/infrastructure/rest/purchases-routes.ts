import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { exhaustive } from '#shared/domain/exhaustive.js';
import type {
  PurchaseOrder,
  PurchaseOrderSummary,
} from '#modules/purchases/domain/purchase-order.js';
import { CreatePurchaseOrder } from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.js';
import {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.input.js';
import {
  EmptyPurchaseOrder,
  ProductNotFoundInOrder,
  PurchaseOrderCreated,
  SupplierNotFoundForOrder,
} from '#modules/purchases/use-cases/create-purchase-order/create-purchase-order.output.js';
import { ListPurchaseOrders } from '#modules/purchases/use-cases/list-purchase-orders/list-purchase-orders.js';
import {
  GetPurchaseOrder,
  PurchaseOrderFound,
  PurchaseOrderNotFoundById,
} from '#modules/purchases/use-cases/get-purchase-order/get-purchase-order.js';
import {
  CancelPurchaseOrder,
  PurchaseOrderCancelled,
  PurchaseOrderNotCancellable,
} from '#modules/purchases/use-cases/cancel-purchase-order/cancel-purchase-order.js';
import { ReceivePurchaseOrder } from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.js';
import {
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderLineInput,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.input.js';
import {
  LineNotInOrder,
  NothingToReceive,
  OrderNotReceivable,
  ProductMissingInInventory,
  PurchaseOrderReceived,
} from '#modules/purchases/use-cases/receive-purchase-order/receive-purchase-order.output.js';

const createOrderDto = z.object({
  supplierId: z.string().min(1),
  notes: z.string().min(1).nullish(),
  createdBy: z.string().min(1),
  lines: z
    .array(
      z
        .object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          unitCostCents: z.number().int().positive(),
          packSize: z.number().int().min(1).nullish(),
          packCostCents: z.number().int().positive().nullish(),
        })
        .refine(
          (line) => (line.packSize == null) === (line.packCostCents == null),
          'packSize y packCostCents van juntos (ambos o ninguno)',
        ),
    )
    .min(1),
});

const receiveOrderDto = z.object({
  receivedBy: z.string().min(1),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCostCents: z.number().int().positive().nullish(),
        // Vencimiento del lote como fecha simple (YYYY-MM-DD).
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
      }),
    )
    .min(1),
});

function toLineResponse(order: PurchaseOrder): Record<string, unknown>[] {
  return order.lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    description: line.description,
    saleType: line.saleType,
    quantityOrdered: line.quantityOrdered,
    quantityReceived: line.quantityReceived,
    pendingQuantity: line.pendingQuantity(),
    unitCostCents: line.unitCostCents,
    packSize: line.packSize,
    packCostCents: line.packCostCents,
    totalCents: line.totalCents(),
  }));
}

function toOrderResponse(order: PurchaseOrder): Record<string, unknown> {
  return {
    id: order.id,
    number: order.number,
    supplierId: order.supplierId,
    status: order.status,
    notes: order.notes,
    createdBy: order.createdBy,
    createdAt: order.createdAt.toISOString(),
    totalCents: order.totalCents(),
    lines: toLineResponse(order),
  };
}

function toSummaryResponse(summary: PurchaseOrderSummary): Record<string, unknown> {
  return {
    id: summary.id,
    number: summary.number,
    supplierId: summary.supplierId,
    supplierName: summary.supplierName,
    status: summary.status,
    linesCount: summary.linesCount,
    totalCents: summary.totalCents,
    createdAt: summary.createdAt.toISOString(),
  };
}

function orderIdParam(request: FastifyRequest): string {
  const params = request.params;
  if (typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string') {
    return params.id;
  }
  throw new Error('Missing id param');
}

export function registerPurchasesRoutes(
  server: FastifyInstance,
  createPurchaseOrder: CreatePurchaseOrder,
  listPurchaseOrders: ListPurchaseOrders,
  getPurchaseOrder: GetPurchaseOrder,
  cancelPurchaseOrder: CancelPurchaseOrder,
  receivePurchaseOrder: ReceivePurchaseOrder,
): void {
  server.post('/purchases/orders/:id/receive', async (request, reply) => {
    const body = receiveOrderDto.parse(request.body);
    const result = await receivePurchaseOrder.execute(
      new ReceivePurchaseOrderInput(
        orderIdParam(request),
        body.receivedBy,
        body.lines.map(
          (line) =>
            new ReceivePurchaseOrderLineInput(
              line.lineId,
              line.quantity,
              line.unitCostCents ?? null,
              line.expiryDate == null ? null : new Date(`${line.expiryDate}T12:00:00`),
            ),
        ),
      ),
    );

    if (result instanceof PurchaseOrderReceived) {
      await reply.status(200).send(toOrderResponse(result.order));
      return;
    }
    if (result instanceof PurchaseOrderNotFoundById) {
      await reply.status(404).send({ code: 'ORDER_NOT_FOUND', orderId: result.orderId });
      return;
    }
    if (result instanceof OrderNotReceivable) {
      await reply
        .status(409)
        .send({ code: 'ORDER_NOT_RECEIVABLE', orderId: result.orderId, status: result.status });
      return;
    }
    if (result instanceof LineNotInOrder) {
      await reply.status(422).send({ code: 'LINE_NOT_IN_ORDER', lineId: result.lineId });
      return;
    }
    if (result instanceof ProductMissingInInventory) {
      await reply.status(422).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof NothingToReceive) {
      await reply.status(400).send({ code: 'NOTHING_TO_RECEIVE' });
      return;
    }
    exhaustive(result);
  });

  server.post('/purchases/orders', async (request, reply) => {
    const body = createOrderDto.parse(request.body);
    const result = await createPurchaseOrder.execute(
      new CreatePurchaseOrderInput(
        body.supplierId,
        body.notes ?? null,
        body.createdBy,
        body.lines.map(
          (line) =>
            new CreatePurchaseOrderLineInput(
              line.productId,
              line.quantity,
              line.unitCostCents,
              line.packSize ?? null,
              line.packCostCents ?? null,
            ),
        ),
      ),
    );

    if (result instanceof PurchaseOrderCreated) {
      await reply.status(201).send(toOrderResponse(result.order));
      return;
    }
    if (result instanceof SupplierNotFoundForOrder) {
      await reply.status(422).send({ code: 'SUPPLIER_NOT_FOUND', supplierId: result.supplierId });
      return;
    }
    if (result instanceof ProductNotFoundInOrder) {
      await reply.status(422).send({ code: 'PRODUCT_NOT_FOUND', productId: result.productId });
      return;
    }
    if (result instanceof EmptyPurchaseOrder) {
      await reply.status(400).send({ code: 'EMPTY_ORDER' });
      return;
    }
    exhaustive(result);
  });

  server.get('/purchases/orders', async (_request, reply) => {
    const summaries = await listPurchaseOrders.execute();
    await reply.status(200).send(summaries.map(toSummaryResponse));
  });

  server.get('/purchases/orders/:id', async (request, reply) => {
    const result = await getPurchaseOrder.execute(orderIdParam(request));
    if (result instanceof PurchaseOrderFound) {
      await reply.status(200).send(toOrderResponse(result.order));
      return;
    }
    if (result instanceof PurchaseOrderNotFoundById) {
      await reply.status(404).send({ code: 'ORDER_NOT_FOUND', orderId: result.orderId });
      return;
    }
    exhaustive(result);
  });

  server.post('/purchases/orders/:id/cancel', async (request, reply) => {
    const result = await cancelPurchaseOrder.execute(orderIdParam(request));
    if (result instanceof PurchaseOrderCancelled) {
      await reply.status(200).send(toOrderResponse(result.order));
      return;
    }
    if (result instanceof PurchaseOrderNotFoundById) {
      await reply.status(404).send({ code: 'ORDER_NOT_FOUND', orderId: result.orderId });
      return;
    }
    if (result instanceof PurchaseOrderNotCancellable) {
      await reply
        .status(409)
        .send({ code: 'ORDER_NOT_CANCELLABLE', orderId: result.orderId, status: result.status });
      return;
    }
    exhaustive(result);
  });
}
