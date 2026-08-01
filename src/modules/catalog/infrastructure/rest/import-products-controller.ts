import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as XLSX from 'xlsx';

import { CreateProduct } from '#modules/catalog/use-cases/create-product/create-product.js';
import {
  CreateUnitProductInput,
  CreateWeightProductInput,
} from '#modules/catalog/use-cases/create-product/create-product.input.js';
import {
  BarcodeAlreadyInUse,
  ProductCreated,
  ShortCodeAlreadyInUse,
  SupplierNotFound,
} from '#modules/catalog/use-cases/create-product/create-product.output.js';
import { RegisterStockEntry } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.js';
import { RegisterStockEntryInput } from '#modules/inventory/use-cases/register-stock-entry/register-stock-entry.input.js';
import { CreateSupplier } from '#modules/suppliers/use-cases/create-supplier/create-supplier.js';
import { CreateSupplierInput } from '#modules/suppliers/use-cases/create-supplier/create-supplier.input.js';
import { ListSuppliers } from '#modules/suppliers/use-cases/list-suppliers/list-suppliers.js';
import { exhaustive } from '#shared/domain/exhaustive.js';

const IMPORT_USER = 'import-excel';
const VALID_CATEGORIES = ['frutas-verduras', 'abarrotes', 'bebidas', 'limpieza', 'pan'] as const;

const importRequestDto = z.object({
  fileBase64: z.string().min(1).max(15_000_000),
});

const rowDto = z.object({
  nombre: z.coerce.string().trim().min(1, 'nombre vacío'),
  tipo: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(['unidad', 'peso'], { message: 'tipo debe ser "unidad" o "peso"' })),
  categoria: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(VALID_CATEGORIES, { message: `categoría inválida (usa: ${VALID_CATEGORIES.join(', ')})` })),
  precio: z.coerce.number({ message: 'precio debe ser un número' }).positive('precio debe ser mayor a 0'),
  costo: z.coerce.number({ message: 'costo debe ser un número' }).nonnegative('costo no puede ser negativo'),
  codigo_barras: z.coerce.string().trim().optional(),
  stock_inicial: z.coerce.number().int().nonnegative().optional(),
  stock_minimo: z.coerce.number().int().nonnegative().optional(),
  proveedor: z.coerce.string().trim().optional(),
  acceso_rapido: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(['si', 'sí', 'no']))
    .optional(),
});

interface RejectedRow {
  row: number;
  name: string;
  reason: string;
}

export class ImportProductsController {
  constructor(
    private readonly createProduct: CreateProduct,
    private readonly registerStockEntry: RegisterStockEntry,
    private readonly createSupplier: CreateSupplier,
    private readonly listSuppliers: ListSuppliers,
  ) {}

  async template(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sheet = XLSX.utils.aoa_to_sheet([
      [
        'nombre',
        'tipo',
        'categoria',
        'precio',
        'costo',
        'codigo_barras',
        'stock_inicial',
        'stock_minimo',
        'proveedor',
        'acceso_rapido',
      ],
      ['Inca Kola 600 ml', 'unidad', 'bebidas', 3.5, 2.8, '7750182000123', 24, 6, 'Distribuidora Lindley', 'si'],
      ['Papaya', 'peso', 'frutas-verduras', 4.5, 3.0, '', 8000, 1000, '', 'si'],
    ]);
    sheet['!cols'] = [{ wch: 24 }, { wch: 8 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'productos');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await reply
      .status(200)
      .header('content-disposition', 'attachment; filename="plantilla-productos-mana.xlsx"')
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .send(buffer);
  }

  async import(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = importRequestDto.parse(request.body);
    const buffer = Buffer.from(body.fileBase64, 'base64');

    let rows: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName === undefined ? undefined : workbook.Sheets[sheetName];
      if (sheet === undefined) {
        await reply.status(400).send({ code: 'EMPTY_FILE', message: 'El archivo no tiene hojas con datos.' });
        return;
      }
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch {
      await reply.status(400).send({
        code: 'UNREADABLE_FILE',
        message: 'No se pudo leer el archivo. Usa la plantilla .xlsx o un .csv con las mismas columnas.',
      });
      return;
    }

    const supplierIdsByName = await this.loadSupplierIndex();
    const rejected: RejectedRow[] = [];
    let createdCount = 0;

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + 2; // +1 por la cabecera, +1 porque Excel arranca en 1
      const parsed = rowDto.safeParse(rawRow);
      if (!parsed.success) {
        const reason = parsed.error.issues.map((issue) => issue.message).join('; ');
        rejected.push({ row: rowNumber, name: String(rawRow.nombre ?? ''), reason });
        continue;
      }
      const row = parsed.data;

      const supplierId = await this.resolveSupplier(row.proveedor, supplierIdsByName);
      const barcode = row.codigo_barras === undefined || row.codigo_barras === '' ? null : row.codigo_barras;
      const quickAccess = row.acceso_rapido === 'si' || row.acceso_rapido === 'sí';
      const priceCents = Math.round(row.precio * 100);
      const costCents = Math.round(row.costo * 100);
      const stockMinimum = row.stock_minimo ?? 0;

      const input =
        row.tipo === 'unidad'
          ? new CreateUnitProductInput(barcode, null, row.nombre, row.categoria, supplierId, priceCents, costCents, stockMinimum, quickAccess)
          : new CreateWeightProductInput(barcode, null, row.nombre, row.categoria, supplierId, priceCents, costCents, stockMinimum, quickAccess);

      const result = await this.createProduct.execute(input);
      if (result instanceof BarcodeAlreadyInUse) {
        rejected.push({ row: rowNumber, name: row.nombre, reason: `el código de barras ${result.barcode} ya pertenece a otro producto` });
        continue;
      }
      if (result instanceof SupplierNotFound) {
        rejected.push({ row: rowNumber, name: row.nombre, reason: 'no se pudo asignar el proveedor' });
        continue;
      }
      if (result instanceof ShortCodeAlreadyInUse) {
        rejected.push({ row: rowNumber, name: row.nombre, reason: `el código corto ${result.shortCode} ya está en uso` });
        continue;
      }
      if (result instanceof ProductCreated) {
        createdCount += 1;
        const initialStock = row.stock_inicial ?? 0;
        if (initialStock > 0) {
          await this.registerStockEntry.execute(
            new RegisterStockEntryInput(result.product.id, initialStock, IMPORT_USER, null, null),
          );
        }
        continue;
      }
      exhaustive(result);
    }

    await reply.status(200).send({ createdCount, totalRows: rows.length, rejected });
  }

  private async loadSupplierIndex(): Promise<Map<string, string>> {
    const all = await this.listSuppliers.execute();
    return new Map(all.map((supplier) => [supplier.name.toLowerCase(), supplier.id]));
  }

  private async resolveSupplier(
    name: string | undefined,
    index: Map<string, string>,
  ): Promise<string | null> {
    if (name === undefined || name === '') {
      return null;
    }
    const existing = index.get(name.toLowerCase());
    if (existing !== undefined) {
      return existing;
    }
    const created = await this.createSupplier.execute(new CreateSupplierInput(name, null, null));
    index.set(name.toLowerCase(), created.id);
    return created.id;
  }
}
