import { z } from 'zod';

import { UnitProduct, type Product } from '#modules/catalog/domain/product.js';

export const createProductDto = z.discriminatedUnion('saleType', [
  z.object({
    saleType: z.literal('unit'),
    barcode: z.string().min(1).nullish(),
    shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
    name: z.string().min(1),
    category: z.string().min(1),
    supplierId: z.string().min(1).nullish(),
    priceCents: z.number().int().positive(),
    costCents: z.number().int().nonnegative(),
    stockMinimum: z.number().int().nonnegative().default(0),
    quickAccess: z.boolean().default(false),
  }),
  z.object({
    saleType: z.literal('weight'),
    barcode: z.string().min(1).nullish(),
    shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
    name: z.string().min(1),
    category: z.string().min(1),
    supplierId: z.string().min(1).nullish(),
    pricePerKgCents: z.number().int().positive(),
    costPerKgCents: z.number().int().nonnegative(),
    stockMinimumGrams: z.number().int().nonnegative().default(0),
    quickAccess: z.boolean().default(false),
  }),
]);

export const updateProductDto = z.object({
  barcode: z.string().min(1).nullish(),
  shortCode: z.string().regex(/^\d{1,3}$/).nullish(),
  name: z.string().min(1),
  category: z.string().min(1),
  supplierId: z.string().min(1).nullish(),
  priceCents: z.number().int().positive(),
  costCents: z.number().int().nonnegative(),
  stockMinimum: z.number().int().nonnegative(),
  active: z.boolean(),
  quickAccess: z.boolean(),
});

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
  orderBy: z.enum(['sales', 'name']).optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  quickAccess: z
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
    supplierId: product.supplierId,
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
