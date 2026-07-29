export type ImageExtension = 'png' | 'jpg' | 'webp';

export interface ImageStore {
  // Guarda la imagen y devuelve la ruta pública (/images/<archivo>).
  save(productId: string, data: Buffer, extension: ImageExtension): Promise<string>;
  remove(publicPath: string): Promise<void>;
}
