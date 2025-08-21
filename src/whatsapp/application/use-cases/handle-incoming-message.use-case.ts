import { Injectable, Inject } from '@nestjs/common';
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import {
  localTodayYMD,
  localTomorrowYMD,
  isValidYMD,
  isValidHHmm,
  getAvailableHours,
  hoursMessage,
  makeStartEndTZ,
  TZ,
} from '../services/time.utils';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';
import { Booking } from 'src/events/domain/entities/booking';

const CANCHA_BTNS = [
  { id: 'cancha_1', title: 'Cancha 1' },
  { id: 'cancha_2', title: 'Cancha 2' },
  { id: 'cancha_3', title: 'Cancha 3' },
];
const DATE_BTNS = [
  { id: 'date_today', title: 'Hoy' },
  { id: 'date_tomorrow', title: 'Mañana' },
  { id: 'date_other', title: 'Otro día' },
];

function normalizeE164(raw: string) {
  const digits = raw.replace(/[^0-9+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

@Injectable()
export class HandleIncomingMessageUseCase {
  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    @Inject('BookingRepository') private readonly bookings: BookingRepository,
    @Inject('ContactsRepository') private readonly contacts: ContactsRepository,
  ) {}

  private async getSession(from: string): Promise<Session> {
    return (await this.sessions.get(from)) ?? { step: 'idle' };
  }
  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }
  private async clearSession(from: string) {
    await this.sessions.del(from);
  }

  async execute(from: string, rawPayload: string): Promise<void> {
    const payload = rawPayload.trim();
    const p = payload.toLowerCase();
    const session = await this.getSession(from);

    // Global
    if (['cancel', 'cancelar', 'salir'].includes(p)) {
      await this.clearSession(from);
      await this.messenger.sendText(
        from,
        'Flujo cancelado. Escribe "menu" para comenzar.',
      );
      return;
    }

    // Menú / inicio: crea/actualiza Contact (intención real de reservar)
    if (
      p.includes('menu') ||
      p.includes('reservar') ||
      p.includes('reserva') ||
      p.includes('inicio') ||
      p === 'start'
    ) {
      const waPhone = normalizeE164(from);
      const contact = await this.contacts.findOrCreateByWaPhone(
        waPhone,
        null,
        TZ,
      );
      await this.setSession(from, { step: 'idle', contactId: contact.id });
      await this.messenger.sendButtons(from, '¿Qué necesitas?', [
        { id: 'opt_reserve', title: 'Reservar cancha' },
      ]);
      return;
    }

    // Inicio de reserva
    if (payload === 'opt_reserve') {
      if (!session.contactId) {
        const waPhone = normalizeE164(from);
        const contact = await this.contacts.findOrCreateByWaPhone(
          waPhone,
          null,
          TZ,
        );
        session.contactId = contact.id;
      }
      session.step = 'choose_cancha';
      await this.setSession(from, session);
      await this.messenger.sendButtons(from, 'Elige la cancha:', CANCHA_BTNS);
      return;
    }

    // 1) Cancha
    if (session.step === 'choose_cancha' && payload.startsWith('cancha_')) {
      const num = Number(payload.split('_')[1]);
      if (![1, 2, 3].includes(num)) {
        await this.messenger.sendButtons(
          from,
          'Cancha inválida. Elige una:',
          CANCHA_BTNS,
        );
        return;
      }
      session.cancha = num;
      session.step = 'choose_date';
      await this.setSession(from, session);
      await this.messenger.sendButtons(
        from,
        `Cancha ${num} seleccionada ✅\nAhora elige la fecha:`,
        DATE_BTNS,
      );
      return;
    }

    // 2) Fecha
    if (session.step === 'choose_date') {
      if (payload === 'date_today') {
        session.date = localTodayYMD();
        session.step = 'choose_time';
        await this.setSession(from, session);
        await this.messenger.sendText(from, hoursMessage(session.date));
        return;
      }
      if (payload === 'date_tomorrow') {
        session.date = localTomorrowYMD();
        session.step = 'choose_time';
        await this.setSession(from, session);
        await this.messenger.sendText(from, hoursMessage(session.date));
        return;
      }
      if (payload === 'date_other') {
        session.step = 'awaiting_other_date';
        await this.setSession(from, session);
        await this.messenger.sendText(
          from,
          'Escribe la fecha en formato YYYY-MM-DD (ej: 2025-08-21).',
        );
        return;
      }
    }

    if (session.step === 'awaiting_other_date') {
      if (!isValidYMD(payload)) {
        await this.messenger.sendText(
          from,
          'Formato inválido. Usa YYYY-MM-DD (ej: 2025-08-21).',
        );
        return;
      }
      session.date = payload;
      session.step = 'choose_time';
      await this.setSession(from, session);
      await this.messenger.sendText(from, hoursMessage(session.date));
      return;
    }

    // 3) Hora (texto)
    if (session.step === 'choose_time') {
      if (!isValidHHmm(payload)) {
        await this.messenger.sendText(
          from,
          'Hora inválida. Usa HH:mm (24h), ej: 18:30',
        );
        return;
      }
      const avail = getAvailableHours(session.date!);
      if (!avail.includes(payload)) {
        if (!avail.length) {
          await this.messenger.sendText(
            from,
            `No quedan horas disponibles para *${session.date}*.\nEscribe "mañana" o una fecha (YYYY-MM-DD).`,
          );
          return;
        }
        await this.messenger.sendText(
          from,
          `Esa hora no está disponible para *${session.date}*.\nDisponibles: ${avail.join(', ')}\nEnvía una hora válida (HH:mm).`,
        );
        return;
      }

      session.time = payload;
      await this.setSession(from, session);

      // Instantes con TZ (UTC al guardar)
      const { start, end } = makeStartEndTZ(session.date!, session.time!, TZ);

      // Solape
      const overlaps = await this.bookings.findByCourtAndDateRange(
        String(session.cancha!),
        start,
        end,
      );
      if (overlaps.length > 0) {
        await this.messenger.sendText(
          from,
          `⚠️ Ese horario ya está reservado para la cancha ${session.cancha}.\nEnvía otra *hora* (HH:mm) o cambia la fecha.`,
        );
        return;
      }

      // Crear reserva con contactId
      const toCreate: any = {
        contactId: session.contactId!,
        courtId: Number(session.cancha!),
        paymentId: null,
        userId: null,
        startTime: start,
        endTime: end,
        status: 'pending',
        date: session.date!, // 'YYYY-MM-DD'
      };
      console.log(JSON.stringify(toCreate, null, 2));
      try {
        await this.bookings.create(toCreate);
        await this.messenger.sendText(
          from,
          `✅ *Reserva guardada*\n• Cancha: ${session.cancha}\n• Fecha: ${session.date}\n• Hora: ${session.time}\n\nEscribe "menu" para nueva reserva o "cancelar" para salir.`,
        );
        await this.clearSession(from);
      } catch (e: any) {
        if (
          e?.code === '23505' ||
          /duplicate key value/i.test(e?.message || '')
        ) {
          await this.messenger.sendText(
            from,
            `⚠️ Ese horario ya está reservado para la cancha ${session.cancha}. Elige otra hora.`,
          );
        } else {
          console.error('[DB][BOOKING] Error:', e);
          await this.messenger.sendText(
            from,
            '❌ Error al guardar la reserva. Intenta en unos minutos.',
          );
        }
      }
      return;
    }

    // Fallback
    await this.messenger.sendText(
      from,
      'No entendí. Escribe "menu" para reservar.\nFlujo: cancha (botón) → fecha (botón/texto) → hora (texto HH:mm).',
    );
  }
}
