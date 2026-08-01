import type { FastifyInstance } from 'fastify';

import type { CatalogController } from '#modules/catalog/infrastructure/rest/catalog-controller.js';
import type { CategoriesController } from '#modules/catalog/infrastructure/rest/categories-controller.js';
import type { ImportProductsController } from '#modules/catalog/infrastructure/rest/import-products-controller.js';

export function registerCatalogRoutes(
  server: FastifyInstance,
  controller: CatalogController,
  importController: ImportProductsController,
  categoriesController: CategoriesController,
): void {
  server.get('/catalog/categories', (request, reply) => categoriesController.list(request, reply));
  server.post('/catalog/categories', (request, reply) => categoriesController.create(request, reply));
  server.put('/catalog/categories/:slug', (request, reply) =>
    categoriesController.update(request, reply),
  );
  server.get('/catalog/products/import/template', (request, reply) =>
    importController.template(request, reply),
  );
  server.post('/catalog/products/import', (request, reply) =>
    importController.import(request, reply),
  );
  server.post('/catalog/products', (request, reply) => controller.create(request, reply));
  server.put('/catalog/products/:id', (request, reply) => controller.update(request, reply));
  server.get('/catalog/products', (request, reply) => controller.search(request, reply));
  server.get('/catalog/products/by-barcode/:barcode', (request, reply) =>
    controller.byBarcode(request, reply),
  );
  server.put('/catalog/products/:id/image', (request, reply) =>
    controller.setImage(request, reply),
  );
  server.delete('/catalog/products/:id/image', (request, reply) =>
    controller.removeImage(request, reply),
  );
}
