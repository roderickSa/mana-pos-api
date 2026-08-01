import type { Nullable } from '#shared/domain/nullable.js';
import { normalizeSearchText } from '#shared/domain/normalize-search-text.js';
import { UnitProduct, WeightProduct } from '#modules/catalog/domain/product.js';

interface UnitProductMotherParams {
  id: string;
  barcode: Nullable<string>;
  shortCode: Nullable<string>;
  name: string;
  category: string;
  supplierIds: string[];
  imagePath: Nullable<string>;
  priceCents: number;
  costCents: number;
  packSize: Nullable<number>;
  packCostCents: Nullable<number>;
  stockUnits: number;
  stockMinimum: number;
  active: boolean;
  quickAccess: boolean;
}

export function unitProductMother(params: Partial<UnitProductMotherParams> = {}): UnitProduct {
  const name = params.name ?? 'Inca Kola 600ml';
  return new UnitProduct(
    params.id ?? 'product-unit-1',
    params.barcode !== undefined ? params.barcode : '7750182000123',
    params.shortCode !== undefined ? params.shortCode : null,
    name,
    normalizeSearchText(name),
    params.category ?? 'bebidas',
    params.supplierIds ?? [],
    params.imagePath !== undefined ? params.imagePath : null,
    params.priceCents ?? 350,
    params.costCents ?? 280,
    params.packSize !== undefined ? params.packSize : null,
    params.packCostCents !== undefined ? params.packCostCents : null,
    params.stockUnits ?? 24,
    params.stockMinimum ?? 6,
    params.active ?? true,
    params.quickAccess ?? false,
    new Date('2026-07-01T08:00:00.000Z'),
    new Date('2026-07-01T08:00:00.000Z'),
  );
}

interface WeightProductMotherParams {
  id: string;
  barcode: Nullable<string>;
  shortCode: Nullable<string>;
  name: string;
  category: string;
  supplierIds: string[];
  imagePath: Nullable<string>;
  pricePerKgCents: number;
  costPerKgCents: number;
  stockGrams: number;
  stockMinimumGrams: number;
  active: boolean;
  quickAccess: boolean;
}

export function weightProductMother(
  params: Partial<WeightProductMotherParams> = {},
): WeightProduct {
  const name = params.name ?? 'Papaya';
  return new WeightProduct(
    params.id ?? 'product-weight-1',
    params.barcode !== undefined ? params.barcode : null,
    params.shortCode !== undefined ? params.shortCode : null,
    name,
    normalizeSearchText(name),
    params.category ?? 'frutas-verduras',
    params.supplierIds ?? [],
    params.imagePath !== undefined ? params.imagePath : null,
    params.pricePerKgCents ?? 450,
    params.costPerKgCents ?? 300,
    params.stockGrams ?? 8_000,
    params.stockMinimumGrams ?? 1_000,
    params.active ?? true,
    params.quickAccess ?? true,
    new Date('2026-07-01T08:00:00.000Z'),
    new Date('2026-07-01T08:00:00.000Z'),
  );
}
