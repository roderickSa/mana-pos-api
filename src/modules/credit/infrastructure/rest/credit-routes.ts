import type { FastifyInstance } from 'fastify';

import type { CreditController } from '#modules/credit/infrastructure/rest/credit-controller.js';

export function registerCreditRoutes(server: FastifyInstance, controller: CreditController): void {
  server.post('/customers', (request, reply) => controller.create(request, reply));
  server.put('/customers/:id', (request, reply) => controller.update(request, reply));
  server.get('/customers', (request, reply) => controller.list(request, reply));
  server.get('/customers/:id/statement', (request, reply) => controller.statement(request, reply));
  server.post('/customers/:id/payments', (request, reply) => controller.abono(request, reply));
}
