import { z } from 'zod';

const configSchema = z.object({
  httpPort: z.coerce.number().int().positive().default(3210),
  databasePath: z.string().default('./mana.sqlite'),
  imagesDir: z.string().default('./data/images'),
  // 'simulated' para desarrollar sin hardware; 'real' en la PC de la tienda.
  devicesMode: z.enum(['simulated', 'real']).default('simulated'),
  backupsDir: z.string().default('./backups'),
  // Carpeta del front compilado; si existe, la API lo sirve (producción local).
  webDistDir: z.string().default('../mana-pos-web/dist'),
  // Modo entrenamiento: BD aparte con datos de práctica, banner en la pantalla.
  training: z
    .string()
    .optional()
    .transform((value) => value === '1'),
  printer: z.object({
    interface: z.string().default('usb'),
    paperWidthMm: z.coerce
      .number()
      .refine((width): width is 58 | 80 => width === 58 || width === 80)
      .default(80),
  }),
  scale: z.object({
    serialPath: z.string().default('COM3'),
    baudRate: z.coerce.number().int().positive().default(9600),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return configSchema.parse({
    httpPort: env.MANA_HTTP_PORT,
    databasePath: env.MANA_DB_PATH,
    imagesDir: env.MANA_IMAGES_DIR,
    devicesMode: env.MANA_DEVICES_MODE,
    backupsDir: env.MANA_BACKUPS_DIR,
    webDistDir: env.MANA_WEB_DIST,
    training: env.MANA_TRAINING,
    printer: {
      interface: env.MANA_PRINTER_INTERFACE,
      paperWidthMm: env.MANA_PRINTER_PAPER_MM,
    },
    scale: {
      serialPath: env.MANA_SCALE_SERIAL_PATH,
      baudRate: env.MANA_SCALE_BAUD_RATE,
    },
  });
}
