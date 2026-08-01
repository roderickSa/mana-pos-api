import { and, eq, or, sql, type SQL } from 'drizzle-orm';

import type { Nullable } from '#shared/domain/nullable.js';
import type { DatabaseClient } from '#shared/infrastructure/database/client.js';
import { products } from '#shared/infrastructure/database/schema.js';
import { fuzzyMatchesName } from '#modules/catalog/domain/fuzzy-match.js';
import { UnitProduct, WeightProduct, type Product } from '#modules/catalog/domain/product.js';
import type { ProductRepository } from '#modules/catalog/ports/product-repository.js';
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
  }

  async findById(id: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.id, id) });
    return row === undefined ? null : this.toEntity(row);
  }

  async findByBarcode(barcode: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.barcode, barcode) });
    return row === undefined ? null : this.toEntity(row);
  }

  async findByShortCode(shortCode: string): Promise<Nullable<Product>> {
    const row = await this.db.query.products.findFirst({ where: eq(products.shortCode, shortCode) });
    return row === undefined ? null : this.toEntity(row);
  }

  async count(params: SearchProductsParams): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(...this.searchConditions(params)));
    return rows[0]?.value ?? 0;
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

    const rows = await this.db
      .select()
      .from(products)
      .where(and(...this.searchConditions(params)))
      .orderBy(
        ...(params.orderBySales
          ? [sql`${products.quickAccess} DESC`, sql`${soldQuantity} DESC`, products.name]
          : [sql`${products.quickAccess} DESC`, products.name]),
      )
      .limit(params.limit)
      .offset(params.offset);

    if (rows.length > 0 || params.normalizedQuery === null || params.offset > 0) {
      return rows.map((row) => this.toEntity(row));
    }
    return this.searchFuzzy(params);
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

    const candidates = await this.db
      .select()
      .from(products)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(products.name)
      .limit(1000);

    return candidates
      .filter((row) => fuzzyMatchesName(row.normalizedName, query))
      .slice(0, params.limit)
      .map((row) => this.toEntity(row));
  }

  private toEntity(row: ProductRow): Product {
    if (row.saleType === 'unit') {
      return new UnitProduct(
        row.id,
        row.barcode,
        row.shortCode,
        row.name,
        row.normalizedName,
        row.category,
        row.supplierId,
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

    return new WeightProduct(
      row.id,
      row.barcode,
      row.shortCode,
      row.name,
      row.normalizedName,
      row.category,
      row.supplierId,
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
      supplierId: product.supplierId,
      imagePath: product.imagePath,
      saleType: isUnit ? 'unit' : 'weight',
      priceCents: isUnit ? product.priceCents : product.pricePerKgCents,
      costCents: isUnit ? product.costCents : product.costPerKgCents,
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
