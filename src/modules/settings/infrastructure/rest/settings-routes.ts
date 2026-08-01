import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  ReceiptConfigService,
  UpdateReceiptConfigInput,
} from '#modules/settings/use-cases/receipt-config-service.js';
import { ExpiryAlertService } from '#modules/settings/use-cases/expiry-alert-service.js';
import { IgvService } from '#modules/settings/use-cases/igv-service.js';

const expiryDto = z.object({ days: z.number().int().min(1).max(90) });
const igvDto = z.object({ ratePercent: z.number().int().min(0).max(25) });

const receiptDto = z.object({
  storeName: z.string().min(1).max(40),
  headerExtra: z.string().max(60).nullish(),
  footerMessage: z.string().min(1).max(80),
});

export function registerSettingsRoutes(
  server: FastifyInstance,
  receiptConfigService: ReceiptConfigService,
  expiryAlertService: ExpiryAlertService,
  igvService: IgvService,
): void {
  server.get('/settings/expiry', async (_request, reply) => {
    await reply.status(200).send({ days: await expiryAlertService.getDays() });
  });

  server.get('/settings/igv', async (_request, reply) => {
    await reply.status(200).send({ ratePercent: await igvService.getRatePercent() });
  });

  server.put('/settings/igv', async (request, reply) => {
    const body = igvDto.parse(request.body);
    await reply.status(200).send({ ratePercent: await igvService.setRatePercent(body.ratePercent) });
  });

  server.put('/settings/expiry', async (request, reply) => {
    const body = expiryDto.parse(request.body);
    await reply.status(200).send({ days: await expiryAlertService.setDays(body.days) });
  });

  server.get('/settings/receipt', async (_request, reply) => {
    const config = await receiptConfigService.get();
    await reply.status(200).send({
      storeName: config.storeName,
      headerExtra: config.headerExtra,
      footerMessage: config.footerMessage,
    });
  });

  server.put('/settings/receipt', async (request, reply) => {
    const body = receiptDto.parse(request.body);
    const config = await receiptConfigService.update(
      new UpdateReceiptConfigInput(
        body.storeName.trim(),
        body.headerExtra === undefined || body.headerExtra === null || body.headerExtra.trim() === ''
          ? null
          : body.headerExtra.trim(),
        body.footerMessage.trim(),
      ),
    );
    await reply.status(200).send({
      storeName: config.storeName,
      headerExtra: config.headerExtra,
      footerMessage: config.footerMessage,
    });
  });
}
