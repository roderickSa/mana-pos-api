import type { ImageExtension } from '#modules/catalog/ports/image-store.js';

export class SetProductImageInput {
  constructor(
    readonly productId: string,
    readonly data: Buffer,
    readonly extension: ImageExtension,
  ) {}
}

export class RemoveProductImageInput {
  constructor(readonly productId: string) {}
}
