import { Injectable } from '@nestjs/common';
import { MessengerPort, Button, ListSection } from '../../domain/ports/messenger.port';
import { WebhookService } from '../../interface/services/webhook.service';

@Injectable()
export class WhatsappMessengerAdapter implements MessengerPort {
  constructor(private readonly svc: WebhookService) {}

  sendText(to: string, text: string): Promise<void> {
    return this.svc.sendText(to, text);
  }

  sendButtons(to: string, text: string, buttons: Button[]): Promise<void> {
    const safe = buttons.slice(0, 3); // WhatsApp: 1–3 botones
    return this.svc.sendButtons(to, text, safe);
  }

  sendList(
    to: string,
    payload: {
      header?: string;
      body: string;
      footer?: string;
      buttonText?: string;
      sections: ListSection[];
    },
  ): Promise<void> {
    return this.svc.sendList(to, payload);
  }
}
