import { Injectable } from '@nestjs/common';
import { MessengerPort, Button } from '../../domain/ports/messenger.port';
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
}
