import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ImageExtension, ImageStore } from '#modules/catalog/ports/image-store.js';

export class FsImageStore implements ImageStore {
  constructor(private readonly imagesDir: string) {}

  async save(productId: string, data: Buffer, extension: ImageExtension): Promise<string> {
    await mkdir(this.imagesDir, { recursive: true });
    const fileName = `${productId}-${Date.now()}.${extension}`;
    await writeFile(path.join(this.imagesDir, fileName), data);
    return `/images/${fileName}`;
  }

  async remove(publicPath: string): Promise<void> {
    const fileName = path.basename(publicPath);
    await rm(path.join(this.imagesDir, fileName), { force: true });
  }
}
