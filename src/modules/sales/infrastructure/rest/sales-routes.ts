import type { FastifyInstance } from 'fastify';

import type { SalesController } from '#modules/sales/infrastructure/rest/sales-controller.js';

export function registerSalesRoutes(server: FastifyInstance, controller: SalesController): void {
  server.post('/sales/checkout', (request, reply) => controller.doCheckout(request, reply));
  server.post('/sales/tickets/:id/void', (request, reply) => controller.doVoid(request, reply));
  server.post('/sales/tickets/:id/reprint', (request, reply) => controller.doReprint(request, reply));
  server.get('/sales/tickets', (request, reply) => controller.list(request, reply));
  server.get('/sales/tickets/export.csv', (request, reply) => controller.exportCsv(request, reply));
}
