import type { ScaleReading } from '#modules/devices/domain/scale-reading.js';

export interface ScaleReader {
  // Última lectura conocida; nunca lanza (la venta no depende de la balanza).
  currentReading(): ScaleReading;
}
