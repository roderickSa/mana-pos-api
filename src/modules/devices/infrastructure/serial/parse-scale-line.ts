import type { Nullable } from '#shared/domain/nullable.js';

// Parsea una línea del protocolo de salida continua de balanzas comerciales.
// Formatos reales típicos: "ST,GS,+  0.645kg", "+0.645 kg", "US,GS, 1.240 kg",
// "  645 g". Devuelve gramos enteros, o null si la línea no trae peso.
export function parseScaleLine(line: string): Nullable<number> {
  const match = line.match(/([-+]?\d+(?:\.\d+)?)\s*(kg|g)\b/i);
  if (match === null) {
    return null;
  }
  const value = Number.parseFloat(match[1] ?? '');
  if (Number.isNaN(value) || value < 0) {
    return null;
  }
  const unit = (match[2] ?? '').toLowerCase();
  return Math.round(unit === 'kg' ? value * 1000 : value);
}
