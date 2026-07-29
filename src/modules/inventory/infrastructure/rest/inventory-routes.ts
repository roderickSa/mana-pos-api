import type { FastifyInstance } from 'fastify';

import type { InventoryController } from '#modules/inventory/infrastructure/rest/inventory-controller.js';

export function registerInventoryRoutes(
  server: FastifyInstance,
  controller: InventoryController,
): void {
  server.post('/inventory/entries', (request, reply) => controller.entry(request, reply));
  server.post('/inventory/adjustments', (request, reply) => controller.adjustment(request, reply));
  server.post('/inventory/counts', (request, reply) => controller.count(request, reply));
  server.get('/inventory/kardex/:productId', (request, reply) =>
    controller.kardex(request, reply),
  );
  server.get('/inventory/movements', (request, reply) => controller.movements(request, reply));
}
