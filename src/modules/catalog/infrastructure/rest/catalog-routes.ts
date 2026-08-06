import type { FastifyInstance } from 'fastify';

import type { CatalogController } from '#modules/catalog/infrastructure/rest/catalog-controller.js';
import type { CategoriesController } from '#modules/catalog/infrastructure/rest/categories-controller.js';
import type { ImportProductsController } from '#modules/catalog/infrastructure/rest/import-products-controller.js';
import type { PricesController } from '#modules/catalog/infrastructure/rest/prices-controller.js';

export function registerCatalogRoutes(
  server: FastifyInstance,
  controller: CatalogController,
  importController: ImportProductsController,
  categoriesController: CategoriesController,
  pricesController: PricesController,
): void {
  server.post('/catalog/prices/preview', (request, reply) =>
    pricesController.preview(request, reply),
  );
  server.post('/catalog/prices/apply', (request, reply) => pricesController.apply(request, reply));
  server.get('/catalog/prices/low-margin', (request, reply) =>
    pricesController.lowMargin(request, reply),
  );
  server.post('/catalog/prices/apply-list', (request, reply) =>
    pricesController.applyList(request, reply),
  );
  server.get('/catalog/categories', (request, reply) => categoriesController.list(request, reply));
  server.post('/catalog/categories', (request, reply) => categoriesController.create(request, reply));
  server.put('/catalog/categories/order', (request, reply) =>
    categoriesController.reorder(request, reply),
  );
  server.put('/catalog/categories/:slug', (request, reply) =>
    categoriesController.update(request, reply),
  );
  server.delete('/catalog/categories/:slug', (request, reply) =>
    categoriesController.remove(request, reply),
  );
  server.get('/catalog/products/import/template', (request, reply) =>
    importController.template(request, reply),
  );
  server.get('/catalog/products/export.xlsx', (request, reply) =>
    importController.export(request, reply),
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
  server.get('/catalog/products/:id/barcodes', (request, reply) =>
    controller.barcodes(request, reply),
  );
  server.post('/catalog/products/:id/barcodes', (request, reply) =>
    controller.addBarcode(request, reply),
  );
  server.delete('/catalog/products/:id/barcodes/:barcode', (request, reply) =>
    controller.removeBarcode(request, reply),
  );
  server.post('/catalog/products/merge', (request, reply) => controller.merge(request, reply));
  server.post('/catalog/products/:id/suppliers/:supplierId', (request, reply) =>
    controller.linkSupplier(request, reply),
  );
  server.delete('/catalog/products/:id/suppliers/:supplierId', (request, reply) =>
    controller.unlinkSupplier(request, reply),
  );
  server.put('/catalog/products/:id/image', (request, reply) =>
    controller.setImage(request, reply),
  );
  server.delete('/catalog/products/:id/image', (request, reply) =>
    controller.removeImage(request, reply),
  );
}
