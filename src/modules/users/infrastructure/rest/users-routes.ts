import type { FastifyInstance } from 'fastify';

import type { UsersController } from '#modules/users/infrastructure/rest/users-controller.js';

export function registerUsersRoutes(server: FastifyInstance, controller: UsersController): void {
  server.post('/users/login', (request, reply) => controller.login(request, reply));
  server.post('/users/verify-manager', (request, reply) => controller.verifyManager(request, reply));
  server.get('/users', (request, reply) => controller.list(request, reply));
  server.post('/users', (request, reply) => controller.create(request, reply));
  server.put('/users/:id', (request, reply) => controller.update(request, reply));
}
