import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  ReceiptConfigService,
  UpdateReceiptConfigInput,
} from '#modules/settings/use-cases/receipt-config-service.js';

const receiptDto = z.object({
  storeName: z.string().min(1).max(40),
  headerExtra: z.string().max(60).nullish(),
  footerMessage: z.string().min(1).max(80),
});

export function registerSettingsRoutes(
  server: FastifyInstance,
  receiptConfigService: ReceiptConfigService,
): void {
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
