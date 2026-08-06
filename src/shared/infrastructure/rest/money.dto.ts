import { z } from 'zod';

// Montos que se pagan o cobran en físico: en Perú la moneda mínima usable es
// de 10 céntimos, así que todo entra en pasos de S/ 0.10.
export function dimeCents(base: z.ZodNumber): z.ZodEffects<z.ZodNumber, number, number> {
  return base.refine((value) => value % 10 === 0, {
    message: 'Los montos van en pasos de 10 céntimos (S/ 0.10).',
  });
}
