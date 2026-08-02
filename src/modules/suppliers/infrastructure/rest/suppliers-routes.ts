import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { Supplier } from '#modules/suppliers/domain/supplier.js';
import { CreateSupplier } from '#modules/suppliers/use-cases/create-supplier/create-supplier.js';
import { CreateSupplierInput } from '#modules/suppliers/use-cases/create-supplier/create-supplier.input.js';
import { ListSuppliers } from '#modules/suppliers/use-cases/list-suppliers/list-suppliers.js';
import {
  SupplierNotFoundById,
  SupplierUpdated,
  UpdateSupplier,
} from '#modules/suppliers/use-cases/update-supplier/update-supplier.js';
import { UpdateSupplierInput } from '#modules/suppliers/use-cases/update-supplier/update-supplier.input.js';

const createSupplierDto = z.object({
  name: z.string().min(1),
  phone: z.string().min(1).nullish(),
  notes: z.string().min(1).nullish(),
  visitDays: z.array(z.enum(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'])).default([]),
  contactName: z.string().min(1).nullish(),
  paymentTerms: z.string().min(1).nullish(),
});

const updateSupplierDto = z.object({
  name: z.string().min(1),
  phone: z.string().min(1).nullish(),
  notes: z.string().min(1).nullish(),
  visitDays: z.array(z.enum(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'])).default([]),
  contactName: z.string().min(1).nullish(),
  paymentTerms: z.string().min(1).nullish(),
  active: z.boolean(),
});

function toSupplierResponse(supplier: Supplier): Record<string, unknown> {
  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    notes: supplier.notes,
    visitDays: supplier.visitDays,
    contactName: supplier.contactName,
    paymentTerms: supplier.paymentTerms,
    active: supplier.active,
  };
}

export function registerSupplierRoutes(
  server: FastifyInstance,
  createSupplier: CreateSupplier,
  listSuppliers: ListSuppliers,
  updateSupplier: UpdateSupplier,
): void {
  server.put('/suppliers/:id', async (request, reply) => {
    const params = request.params;
    const id =
      typeof params === 'object' && params !== null && 'id' in params && typeof params.id === 'string'
        ? params.id
        : '';
    const body = updateSupplierDto.parse(request.body);
    const result = await updateSupplier.execute(
      new UpdateSupplierInput(
        id,
        body.name,
        body.phone ?? null,
        body.notes ?? null,
        body.visitDays,
        body.contactName ?? null,
        body.paymentTerms ?? null,
        body.active,
      ),
    );
    if (result instanceof SupplierUpdated) {
      await reply.status(200).send(toSupplierResponse(result.supplier));
      return;
    }
    if (result instanceof SupplierNotFoundById) {
      await reply.status(404).send({ code: 'SUPPLIER_NOT_FOUND', supplierId: result.supplierId });
    }
  });
  server.post('/suppliers', async (request, reply) => {
    const body = createSupplierDto.parse(request.body);
    const supplier = await createSupplier.execute(
      new CreateSupplierInput(
        body.name,
        body.phone ?? null,
        body.notes ?? null,
        body.visitDays,
        body.contactName ?? null,
        body.paymentTerms ?? null,
      ),
    );
    await reply.status(201).send(toSupplierResponse(supplier));
  });

  server.get('/suppliers', async (_request, reply) => {
    const all = await listSuppliers.execute();
    await reply.status(200).send(all.map(toSupplierResponse));
  });
}
