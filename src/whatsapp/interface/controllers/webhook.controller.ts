import { Controller, Get, Post, Query, Headers, Body, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { HandleIncomingMessageUseCase } from '../../application/use-cases/handle-incoming-message.use-case';

@Controller('webhook/whatsapp')
export class WebhookController {
  constructor(private readonly handleMessage: HandleIncomingMessageUseCase) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Get('test') getHello(): string { return 'GET de prueba funcionando 🚀'; }

  @Post()
  @HttpCode(200)
  async receive(
    @Headers('x-hub-signature-256') _signature: string,
    @Body() body: any,
  ) {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value) return;
    if (Array.isArray(value.statuses) && value.statuses.length) return;

    const msg = value?.messages?.[0];
    if (!msg) return;

    const from: string | undefined = msg.from;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload: string | undefined =
      msg.text?.body ??
      msg.interactive?.button_reply?.id ??
      msg.interactive?.list_reply?.id ??
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title;

    if (!from || !payload) return;
    await this.handleMessage.execute(from, payload.trim());
  }
}
