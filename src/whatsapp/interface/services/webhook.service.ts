// src/webhook/webhook.service.ts
import { Injectable } from '@nestjs/common';

const WA_BASE = 'https://graph.facebook.com/v20.0';

@Injectable()
export class WebhookService {
  private endpoint() {
    const id = process.env.WHATSAPP_PHONE_NUMBER_ID; // <- tu variable .env
    console.log(id);
    if (!id) console.error('[CFG] Falta WHATSAPP_PHONE_NUMBER_ID en .env');
    return `${WA_BASE}/${id}/messages`;
  }

  private headers() {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN; // <- tu variable .env
    if (!token) console.error('[CFG] Falta WHATSAPP_CLOUD_API_TOKEN en .env');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async post(payload: unknown) {
    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        ...(payload as object),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[WA][SEND] Error:', res.status, text);
    } else {
      console.log('[WA][SEND] OK:', res.status);
    }
  }

  async sendText(to: string, body: string) {
    await this.post({
      to,
      type: 'text',
      text: { body },
    });
  }

  async sendButtons(to: string, body: string, buttons: { id: string; title: string }[]) {
    await this.post({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }
}
