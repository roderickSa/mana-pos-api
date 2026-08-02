import type { Nullable } from '#shared/domain/nullable.js';
import { ProductLotGroup, type ProductLot } from '#modules/inventory/domain/product-lot.js';
import type { LotRepository } from '#modules/inventory/ports/lot-repository.js';

export class LotRepositoryForTesting implements LotRepository {
  private readonly lotsById = new Map<string, ProductLot>();
  private readonly productsById = new Map<
    string,
    { name: string; saleType: 'unit' | 'weight'; stock: number }
  >();

  seedProduct(id: string, name: string, saleType: 'unit' | 'weight', stock: number): void {
    this.productsById.set(id, { name, saleType, stock });
  }

  all(): ProductLot[] {
    return [...this.lotsById.values()];
  }

  async save(lot: ProductLot): Promise<void> {
    this.lotsById.set(lot.id, lot);
  }

  async findById(id: string): Promise<Nullable<ProductLot>> {
    return this.lotsById.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.lotsById.delete(id);
  }

  async listGroupsWithLots(): Promise<ProductLotGroup[]> {
    const groups: ProductLotGroup[] = [];
    for (const [productId, product] of this.productsById) {
      const lots = this.all().filter((lot) => lot.productId === productId);
      if (lots.length > 0) {
        groups.push(
          new ProductLotGroup(productId, product.name, product.saleType, product.stock, lots),
        );
      }
    }
    return groups;
  }
}
