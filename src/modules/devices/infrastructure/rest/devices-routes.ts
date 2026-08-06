import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { WeightRead } from '#modules/devices/domain/scale-reading.js';
import { listSystemPrinters } from '#modules/devices/infrastructure/system-printers.js';
import type { ScaleReader } from '#modules/devices/ports/scale-reader.js';
import {
  ReceiptPrinted,
  type CashDrawer,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';
import type { PrinterConfigService } from '#modules/settings/use-cases/printer-config-service.js';

const printerConfigDto = z.object({
  // null = usar la de la variable de entorno / auto.
  printerName: z.string().min(1).max(120).nullable(),
  paperWidthMm: z.union([z.literal(58), z.literal(80)]),
});

export function registerDevicesRoutes(
  server: FastifyInstance,
  scaleReader: ScaleReader,
  receiptPrinter: ReceiptPrinter,
  cashDrawer: CashDrawer,
  printerConfig: PrinterConfigService,
  devicesMode: 'simulated' | 'real',
): void {
  // Impresoras instaladas en el sistema (Windows en la tienda, CUPS en dev).
  server.get('/devices/printers', async (_request, reply) => {
    const items = await listSystemPrinters();
    await reply.status(200).send({ items });
  });

  server.get('/devices/printer-config', async (_request, reply) => {
    const config = await printerConfig.get();
    await reply
      .status(200)
      .send({ printerName: config.printerName, paperWidthMm: config.paperWidthMm });
  });

  // Aplica desde el siguiente voucher, sin reiniciar el sistema.
  server.put('/devices/printer-config', async (request, reply) => {
    const body = printerConfigDto.parse(request.body);
    const updated = await printerConfig.update(body.printerName, body.paperWidthMm);
    await reply
      .status(200)
      .send({ printerName: updated.printerName, paperWidthMm: updated.paperWidthMm });
  });

  server.get('/devices/scale', async (_request, reply) => {
    const reading = scaleReader.currentReading();
    if (reading instanceof WeightRead) {
      await reply.status(200).send({ connected: true, grams: reading.grams, message: null });
      return;
    }
    await reply.status(200).send({ connected: false, grams: null, message: reading.humanMessage });
  });

  server.get('/devices/status', async (_request, reply) => {
    const reading = scaleReader.currentReading();
    await reply.status(200).send({
      mode: devicesMode,
      printer: {
        message:
          devicesMode === 'real'
            ? 'Impresora configurada — usa la página de prueba para verificarla'
            : 'Impresora simulada (modo desarrollo): el voucher se registra en el log',
      },
      scale:
        reading instanceof WeightRead
          ? { connected: true, grams: reading.grams, message: null }
          : { connected: false, grams: null, message: reading.humanMessage },
    });
  });

  server.post('/devices/printer/test', async (_request, reply) => {
    const result = await receiptPrinter.printTestPage();
    if (result instanceof ReceiptPrinted) {
      await reply.status(200).send({
        ok: true,
        message:
          devicesMode === 'real'
            ? 'Página de prueba enviada — revisa la impresora'
            : 'Página de prueba simulada registrada en el log (modo desarrollo)',
      });
      return;
    }
    await reply.status(200).send({ ok: false, message: result.humanMessage });
  });

  server.post('/devices/drawer/open', async (_request, reply) => {
    await cashDrawer.open();
    await reply.status(200).send({
      ok: true,
      message:
        devicesMode === 'real'
          ? 'Pulso enviado al cajón — si no abrió, revisa el cable con la impresora'
          : 'Apertura simulada registrada en el log (modo desarrollo)',
    });
  });
}
