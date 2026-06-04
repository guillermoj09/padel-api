import { Injectable, Logger } from '@nestjs/common';
import { WhatsappMessengerAdapter } from 'src/whatsapp/infrastructure/messaging/whatsapp.messenger.adapter';
import type { Booking } from '../../domain/entities/booking';

const DEFAULT_TZ = 'America/Santiago';

function toWhatsAppRecipient(phone?: string | null): string | null {
  if (!phone) return null;

  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

function formatDate(value: Date | string, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: Date | string, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

@Injectable()
export class BookingWhatsappNotificationService {
  private readonly logger = new Logger(BookingWhatsappNotificationService.name);

  constructor(private readonly messenger: WhatsappMessengerAdapter) {}

  async notifyBookingCancelled(
    booking: Booking,
    input?: { reason?: string | null },
  ): Promise<void> {
    const to = toWhatsAppRecipient(booking.phoneNumber);

    if (!to) {
      this.logger.warn(
        `No se envió WhatsApp de cancelación para booking ${booking.id}: sin teléfono asociado`,
      );
      return;
    }

    const dateText = formatDate(booking.startTime);
    const startText = formatTime(booking.startTime);
    const endText = formatTime(booking.endTime);
    const title = booking.title?.trim() || 'tu reserva';
    const reason = input?.reason?.trim();

    const body = [
      `Hola 👋`,
      '',
      `Te informamos que *${title}* fue cancelada.`,
      '',
      `📅 Fecha: ${dateText}`,
      `🕒 Hora: ${startText} - ${endText}`,
      reason ? `📝 Motivo: ${reason}` : null,
      '',
      'Si necesitas una nueva reserva, puedes escribirnos por este mismo WhatsApp.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await this.messenger.sendText(to, body);
    } catch (error) {
      this.logger.error(
        `Error enviando WhatsApp de cancelación para booking ${booking.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
