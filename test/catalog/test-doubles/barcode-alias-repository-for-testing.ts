import type { Nullable } from '#shared/domain/nullable.js';
import type { BarcodeAliasRepository } from '#modules/catalog/ports/barcode-alias-repository.js';

export class BarcodeAliasRepositoryForTesting implements BarcodeAliasRepository {
  private readonly ownerByBarcode = new Map<string, string>();

  async listByProduct(productId: string): Promise<string[]> {
    return [...this.ownerByBarcode.entries()]
      .filter(([, owner]) => owner === productId)
      .map(([barcode]) => barcode);
  }

  async ownerOf(barcode: string): Promise<Nullable<string>> {
    return this.ownerByBarcode.get(barcode) ?? null;
  }

  async add(productId: string, barcode: string): Promise<void> {
    this.ownerByBarcode.set(barcode, productId);
  }

  async remove(productId: string, barcode: string): Promise<void> {
    if (this.ownerByBarcode.get(barcode) === productId) {
      this.ownerByBarcode.delete(barcode);
    }
  }
}
