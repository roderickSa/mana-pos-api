import { z } from 'zod';

import { UnitProduct, type Product } from '#modules/catalog/domain/product.js';

// El empaque viene completo o no viene: caja de N unidades a un costo dado.
const packFields = {
  packSize: z.number().int().min(1).nullish(),
  packCostCents: z.number().int().positive().nullish(),
};

function packIsComplete(body: {
  packSize?: number | null | undefined;
  packCostCents?: number | null | undefined;
}): boolean {
  return (body.packSize == null) === (body.packCostCents == null);
}

const PACK_INCOMPLETE_MESSAGE = 'packSize y packCostCents van juntos (ambos o ninguno)';

export const createProductDto = z
  .discriminatedUnion('saleType', [
    z.object({
      saleType: z.literal('unit'),
      barcode: z.string().min(1).nullish(),
      shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
      name: z.string().min(1),
      category: z.string().min(1),
      supplierIds: z.array(z.string().min(1)).default([]),
      priceCents: z.number().int().positive(),
      costCents: z.number().int().nonnegative(),
      ...packFields,
      stockMinimum: z.number().int().nonnegative().default(0),
      quickAccess: z.boolean().default(false),
      allowDuplicateName: z.boolean().default(false),
    }),
    z.object({
      saleType: z.literal('weight'),
      barcode: z.string().min(1).nullish(),
      shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
      name: z.string().min(1),
      category: z.string().min(1),
      supplierIds: z.array(z.string().min(1)).default([]),
      pricePerKgCents: z.number().int().positive(),
      costPerKgCents: z.number().int().nonnegative(),
      stockMinimumGrams: z.number().int().nonnegative().default(0),
      quickAccess: z.boolean().default(false),
      allowDuplicateName: z.boolean().default(false),
    }),
  ])
  .refine((body) => body.saleType !== 'unit' || packIsComplete(body), PACK_INCOMPLETE_MESSAGE);

export const updateProductDto = z
  .object({
    barcode: z.string().min(1).nullish(),
    shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
    name: z.string().min(1),
    category: z.string().min(1),
    supplierIds: z.array(z.string().min(1)).default([]),
    priceCents: z.number().int().positive(),
    costCents: z.number().int().nonnegative(),
    ...packFields,
    stockMinimum: z.number().int().nonnegative(),
    active: z.boolean(),
    quickAccess: z.boolean(),
  })
  .refine(packIsComplete, PACK_INCOMPLETE_MESSAGE);

export const setProductImageDto = z.object({
  // data URL: data:image/png;base64,....
  imageBase64: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .max(2_000_000),
});

export function parseImageDataUrl(imageBase64: string): { data: Buffer; extension: 'png' | 'jpg' | 'webp' } {
  const [header = '', body = ''] = imageBase64.split(',');
  const extension = header.includes('png') ? 'png' : header.includes('webp') ? 'webp' : 'jpg';
  return { data: Buffer.from(body, 'base64'), extension };
}

export const searchProductsDto = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  orderBy: z.enum(['sales', 'name']).optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  quickAccess: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  noCost: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export function toProductResponse(product: Product): Record<string, unknown> {
  const base = {
    id: product.id,
    barcode: product.barcode,
    shortCode: product.shortCode,
    name: product.name,
    category: product.category,
    supplierIds: product.supplierIds,
    imagePath: product.imagePath,
    active: product.active,
    quickAccess: product.quickAccess,
  };

  if (product instanceof UnitProduct) {
    return {
      ...base,
      saleType: 'unit',
      priceCents: product.priceCents,
      costCents: product.costCents,
      packSize: product.packSize,
      packCostCents: product.packCostCents,
      stockUnits: product.stockUnits,
      stockMinimum: product.stockMinimum,
    };
  }

  return {
    ...base,
    saleType: 'weight',
    pricePerKgCents: product.pricePerKgCents,
    costPerKgCents: product.costPerKgCents,
    stockGrams: product.stockGrams,
    stockMinimumGrams: product.stockMinimumGrams,
  };
}
