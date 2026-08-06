import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { productBarcodes, products, productSuppliers } from '#shared/infrastructure/database/schema.js';
import { fuzzyMatchesName } from '#modules/catalog/domain/fuzzy-match.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { PriceUpdate, ProductRepository } from '#modules/catalog/ports/product-repository.js';
import type { SearchProductsParams } from '#modules/catalog/ports/search-products-params.js';

type ProductRow = typeof products.$inferSelect;
type ProductWriteRow = Omit<ProductRow, 'expiryDate'>;

export class SqliteProductRepository implements ProductRepository {
  constructor(private readonly db: DatabaseClient) {}

  async save(product: Product): Promise<void> {
    const row = this.toRow(product);
    await this.db
      .insert(products)
      .values(row)
      .onConflictDoUpdate({ target: products.id, set: row });
    await this.db.delete(productSuppliers).where(eq(productSuppliers.productId, product.id));
    if (product.supplierIds.length > 0) {
      await this.db
        .insert(productSuppliers)
        .values(product.supplierIds.map((supplierId) => ({ productId: product.id, supplierId })));
    }
  }

  async findById(id: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.id, id) });
    return row === undefined ? null : this.toEntityWithSuppliers(row);
  }

  async findByBarcode(barcode: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.barcode, barcode) });
    if (row !== undefined) {
      return this.toEntityWithSuppliers(row);
    }
    // Alias: un producto puede tener N códigos; escanear cualquiera lo trae.
    const alias = await this.db.query.productBarcodes.findFirst({
      where: eq(productBarcodes.barcode, barcode),
    });
    return alias === undefined ? null : this.findById(alias.productId);
  }

  async findByNormalizedName(normalizedName: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({
      where: eq(products.normalizedName, normalizedName),
    });
    return row === undefined ? null : this.toEntityWithSuppliers(row);
  }

  async findByShortCode(shortCode: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.shortCode, shortCode) });
    return row === undefined ? null : this.toEntityWithSuppliers(row);
  }

  private async toEntityWithSuppliers(row: ProductRow): Promise<Product> {
    const supplierIds = await this.supplierIdsByProduct([row.id]);
    return this.toEntity(row, supplierIds.get(row.id) ?? []);
  }

  private async supplierIdsByProduct(productIds: string[]): Promise<Map<string, string[]>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(productSuppliers)
      .where(inArray(productSuppliers.productId, productIds));
    const byProduct = new Map<string, string[]>();
    for (const row of rows) {
      const ids = byProduct.get(row.productId) ?? [];
      ids.push(row.supplierId);
      byProduct.set(row.productId, ids);
    }
    return byProduct;
  }

  async count(params: SearchProductsParams): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(...this.searchConditions(params)));
    return rows[0]?.value ?? 0;
  }

  async updatePrices(updates: PriceUpdate[], at: Date): Promise<void> {
    this.db.transaction((tx) => {
      for (const update of updates) {
        tx.update(products)
          .set({ priceCents: update.priceCents, updatedAt: at })
          .where(eq(products.id, update.productId))
          .run();
      }
    });
  }

  private searchConditions(params: SearchProductsParams): SQL[] {
    const conditions: SQL[] = [];

    if (!params.includeInactive) {
      conditions.push(eq(products.active, true));
    }
    if (params.category !== null) {
      conditions.push(eq(products.category, params.category));
    }
    if (params.onlyQuickAccess) {
      conditions.push(eq(products.quickAccess, true));
    }
    if (params.onlyLowStock) {
      // Bajo = en o debajo del mínimo configurado (mínimo 0 = sin alerta).
      conditions.push(
        sql`${products.stockQuantity} <= ${products.stockMinimum} AND ${products.stockMinimum} > 0`,
      );
    }
    if (params.supplierId !== null) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = ${products.id} AND ps.supplier_id = ${params.supplierId})`,
      );
    }
    if (params.onlyMissingCost) {
      conditions.push(sql`${products.costCents} = 0`);
    }
    if (params.normalizedQuery !== null) {
      const byName = params.normalizedQuery.split(' ').map((token) => {
        const pattern = `%${escapeLikePattern(token)}%`;
        return sql`${products.normalizedName} LIKE ${pattern} ESCAPE '\\'`;
      });
      const nameCondition = and(...byName);
      // Tolerancia a typos de espacios/guiones: "cocacola" matchea "coca-cola".
      const compactQuery = params.normalizedQuery.replace(/[\s\-.]/g, '');
      const compactPattern = `%${escapeLikePattern(compactQuery)}%`;
      const compactCondition = sql`replace(replace(replace(${products.normalizedName}, ' ', ''), '-', ''), '.', '') LIKE ${compactPattern} ESCAPE '\\'`;
      // Un query numérico busca por barcode exacto; 1-3 dígitos, por código corto.
      const isBarcodeLike = /^\d{6,}$/.test(params.normalizedQuery);
      const isShortCodeLike = /^\d{1,3}$/.test(params.normalizedQuery);
      const combined = isBarcodeLike
        ? or(nameCondition, compactCondition, eq(products.barcode, params.normalizedQuery))
        : isShortCodeLike
          ? or(nameCondition, compactCondition, eq(products.shortCode, params.normalizedQuery))
          : or(nameCondition, compactCondition);
      if (combined !== undefined) {
        conditions.push(combined);
      }
    }

    return conditions;
  }

  async search(params: SearchProductsParams): Promise<Product[]> {
    const soldQuantity = sql`(
      SELECT COALESCE(SUM(-sm.quantity), 0)
      FROM stock_movements sm
      WHERE sm.product_id = ${products.id} AND sm.type = 'sale'
    )`;

    const direction = params.descending ? sql`DESC` : sql`ASC`;
    // Margen relativo; sin costo no hay margen — esos van SIEMPRE al final,
    // suba o baje el orden.
    const margin = sql`CASE
      WHEN ${products.costCents} > 0 AND ${products.priceCents} > 0
      THEN (${products.priceCents} - ${products.costCents}) * 1.0 / ${products.priceCents}
      ELSE ${params.descending ? sql`-1e9` : sql`1e9`}
    END`;
    const orderColumns = {
      default: [sql`${products.quickAccess} DESC`, products.name],
      sales: [sql`${products.quickAccess} DESC`, sql`${soldQuantity} DESC`, products.name],
      name: [sql`${products.name} COLLATE NOCASE ${direction}`],
      price: [sql`${products.priceCents} ${direction}`, products.name],
      stock: [sql`${products.stockQuantity} ${direction}`, products.name],
      margin: [sql`${margin} ${direction}`, products.name],
    }[params.orderBy];

    const rows = await this.db
      .select()
      .from(products)
      .where(and(...this.searchConditions(params)))
      .orderBy(...orderColumns)
      .limit(params.limit)
      .offset(params.offset);

    if (rows.length > 0 || params.normalizedQuery === null || params.offset > 0) {
      return this.toEntities(rows);
    }
    return this.searchFuzzy(params);
  }

  private async toEntities(rows: ProductRow[]): Promise<Product[]> {
    const supplierIds = await this.supplierIdsByProduct(rows.map((row) => row.id));
    return rows.map((row) => this.toEntity(row, supplierIds.get(row.id) ?? []));
  }

  // Segundo intento tolerante a typos: si el LIKE no encontró nada, se
  // comparan los nombres con distancia de Levenshtein ("azucr" → "azucar").
  private async searchFuzzy(params: SearchProductsParams): Promise<Product[]> {
    const query = params.normalizedQuery;
    if (query === null || /^\d+$/.test(query)) return [];

    const filters: SQL[] = [];
    if (!params.includeInactive) filters.push(eq(products.active, true));
    if (params.category !== null) filters.push(eq(products.category, params.category));
    if (params.onlyQuickAccess) filters.push(eq(products.quickAccess, true));
    if (params.supplierId !== null) {
      filters.push(
        sql`EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = ${products.id} AND ps.supplier_id = ${params.supplierId})`,
      );
    }

    const candidates = await this.db
      .select()
      .from(products)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(products.name)
      .limit(1000);

    return this.toEntities(
      candidates.filter((row) => fuzzyMatchesName(row.normalizedName, query)).slice(0, params.limit),
    );
  }

  private toEntity(row: ProductRow, supplierIds: string[]): Product {
    if (row.saleType === 'unit') {
      return new UnitProduct(
        row.id,
        row.barcode,
        row.shortCode,
        row.name,
        row.normalizedName,
        row.category,
        supplierIds,
        row.imagePath,
        row.priceCents,
        row.costCents,
        row.packSize,
        row.packCostCents,
        row.stockQuantity,
        row.stockMinimum,
        row.active,
        row.quickAccess,
        row.createdAt,
        row.updatedAt,
      );
    }

    return new WeightProduct(
      row.id,
      row.barcode,
      row.shortCode,
      row.name,
      row.normalizedName,
      row.category,
      supplierIds,
      row.imagePath,
      row.priceCents,
      row.costCents,
      row.stockQuantity,
      row.stockMinimum,
      row.active,
      row.quickAccess,
      row.createdAt,
      row.updatedAt,
    );
  }

  // La caducidad la administra el módulo inventory: catálogo nunca la pisa.
  private toRow(product: Product): ProductWriteRow {
    const isUnit = product instanceof UnitProduct;
    return {
      id: product.id,
      barcode: product.barcode,
      shortCode: product.shortCode,
      name: product.name,
      normalizedName: product.normalizedName,
      category: product.category,
      imagePath: product.imagePath,
      saleType: isUnit ? 'unit' : 'weight',
      priceCents: isUnit ? product.priceCents : product.pricePerKgCents,
      costCents: isUnit ? product.costCents : product.costPerKgCents,
      packSize: isUnit ? product.packSize : null,
      packCostCents: isUnit ? product.packCostCents : null,
      stockQuantity: isUnit ? product.stockUnits : product.stockGrams,
      stockMinimum: isUnit ? product.stockMinimum : product.stockMinimumGrams,
      active: product.active,
      quickAccess: product.quickAccess,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

function escapeLikePattern(token: string): string {
  return token.replace(/[\\%_]/g, (char) => `\\${char}`);
}
