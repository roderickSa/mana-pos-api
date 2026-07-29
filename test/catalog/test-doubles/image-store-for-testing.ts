import type { ImageExtension, ImageStore } from '#modules/catalog/ports/image-store.js';

export class ImageStoreForTesting implements ImageStore {
  readonly saved: string[] = [];
  readonly removed: string[] = [];

  async save(productId: string, _data: Buffer, extension: ImageExtension): Promise<string> {
    const publicPath = `/images/${productId}.${extension}`;
    this.saved.push(publicPath);
    return publicPath;
  }

  async remove(publicPath: string): Promise<void> {
    this.removed.push(publicPath);
  }
}
