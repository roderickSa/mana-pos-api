import type { FastifyInstance } from 'fastify';

import { WeightRead } from '#modules/devices/domain/scale-reading.js';
import type { ScaleReader } from '#modules/devices/ports/scale-reader.js';
import {
  ReceiptPrinted,
  type CashDrawer,
  type ReceiptPrinter,
} from '#modules/sales/ports/receipt-printer.js';

export function registerDevicesRoutes(
  server: FastifyInstance,
  scaleReader: ScaleReader,
  receiptPrinter: ReceiptPrinter,
  cashDrawer: CashDrawer,
  devicesMode: 'simulated' | 'real',
): void {
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
