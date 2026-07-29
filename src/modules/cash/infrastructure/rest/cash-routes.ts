import type { FastifyInstance } from 'fastify';

import type { CashController } from '#modules/cash/infrastructure/rest/cash-controller.js';

export function registerCashRoutes(server: FastifyInstance, controller: CashController): void {
  server.get('/cash/status', (request, reply) => controller.status(request, reply));
  server.post('/cash/open', (request, reply) => controller.open(request, reply));
  server.post('/cash/movements', (request, reply) => controller.movement(request, reply));
  server.post('/cash/close', (request, reply) => controller.close(request, reply));
}
