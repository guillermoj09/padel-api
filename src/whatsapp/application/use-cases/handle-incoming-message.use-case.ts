import { Injectable, Inject } from '@nestjs/common';
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import {
  localTodayYMD,
  localTomorrowYMD,
  isValidHHmm,
  makeStartEndTZ,
  getAvailableHoursForCourt, // ⬅️ disponibilidad real contra BD
  TZ,
} from '../services/time.utils';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';

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

// ✅ Helpers para DD-MM-AAAA
const reDateDMY = /^\d{2}-\d{2}-\d{4}$/; // DD-MM-AAAA
function dmyToYmd(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split('-').map(Number);
  const d = String(dd).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${yyyy}-${m}-${d}`; // YYYY-MM-DD
}
function ymdToDmy(ymd: string): string {
  const [yyyy, mm, dd] = ymd.split('-');
  return `${dd}-${mm}-${yyyy}`;
}
function normalizeE164(raw: string) {
  const digits = raw.replace(/[^0-9+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// 📌 Config de negocio (puedes moverlo a env)
const BUSINESS = { open: '07:00', close: '23:00', slotMinutes: 60 };

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

  // 🔹 Centraliza la construcción y envío del mensaje de disponibilidad REAL
  private async sendAvailability(from: string, ymd: string, courtId: string | number) {
    const slots = await getAvailableHoursForCourt(
      ymd,
      courtId,
      async (cId, dayStart, dayEnd) => {
        const rows = await this.bookings.findByCourtAndDateRange(String(cId), dayStart, dayEnd);
        // normaliza shape
        return rows.map(r => ({ startTime: r.startTime, endTime: r.endTime }));
      },
      { open: BUSINESS.open, close: BUSINESS.close, slotMinutes: BUSINESS.slotMinutes }
    );

    const shown = ymdToDmy(ymd);
    if (!slots.length) {
      await this.messenger.sendText(
        from,
        `No hay horarios disponibles para *${shown}*.\nEscribe "mañana" o una fecha (DD-MM-AAAA).`
      );
      return;
    }
    await this.messenger.sendText(
      from,
      `📅 Fecha *${shown}* seleccionada.\nHorarios disponibles: ${slots.join(', ')}\n\nEscribe la *hora* (HH:mm, 24h).`
    );
  }

  async execute(from: string, rawPayload: string): Promise<void> {
    const payload = rawPayload.trim();
    const p = payload.toLowerCase();
    const session = await this.getSession(from);

    // Global
    if (['cancel', 'cancelar', 'salir'].includes(p)) {
      await this.clearSession(from);
      await this.messenger.sendText(from, 'Flujo cancelado. Escribe "menu" para comenzar.');
      return;
    }

    // Menú / inicio
    if (
      p.includes('menu') ||
      p.includes('reservar') ||
      p.includes('reserva') ||
      p.includes('inicio') ||
      p === 'start'
    ) {
      const waPhone = normalizeE164(from);
      const contact = await this.contacts.findOrCreateByWaPhone(waPhone, null, TZ);
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
        const contact = await this.contacts.findOrCreateByWaPhone(waPhone, null, TZ);
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
        await this.messenger.sendButtons(from, 'Cancha inválida. Elige una:', CANCHA_BTNS);
        return;
      }
      session.cancha = num;
      session.step = 'choose_date';
      await this.setSession(from, session);
      await this.messenger.sendButtons(
        from,
        `Cancha ${num} seleccionada ✅\nAhora elige la fecha:`,
        DATE_BTNS
      );
      return;
    }

    // 2) Fecha
    if (session.step === 'choose_date') {
      if (payload === 'date_today') {
        session.date = localTodayYMD();     // YYYY-MM-DD
        session.step = 'choose_time';
        await this.setSession(from, session);
        await this.sendAvailability(from, session.date, String(session.cancha!)); // ⬅️ REAL
        return;
      }
      if (payload === 'date_tomorrow') {
        session.date = localTomorrowYMD();  // YYYY-MM-DD
        session.step = 'choose_time';
        await this.setSession(from, session);
        await this.sendAvailability(from, session.date, String(session.cancha!)); // ⬅️ REAL
        return;
      }
      if (payload === 'date_other') {
        session.step = 'awaiting_other_date';
        await this.setSession(from, session);
        await this.messenger.sendText(
          from,
          'Escribe la fecha en formato **DD-MM-AAAA** (ej: 21-08-2025).'
        );
        return;
      }
    }

    if (session.step === 'awaiting_other_date') {
      if (!reDateDMY.test(payload)) {
        await this.messenger.sendText(
          from,
          'Formato inválido. Usa **DD-MM-AAAA** (ej: 21-08-2025).'
        );
        return;
      }
      const ymd = dmyToYmd(payload); // → YYYY-MM-DD
      session.date = ymd;
      session.step = 'choose_time';
      await this.setSession(from, session);
      await this.sendAvailability(from, session.date, String(session.cancha!));   // ⬅️ REAL
      return;
    }

    // 3) Hora (texto)
    if (session.step === 'choose_time') {
      if (!isValidHHmm(payload)) {
        await this.messenger.sendText(from, 'Hora inválida. Usa HH:mm (24h), ej: 18:30');
        return;
      }

      // Recalcula disponibilidad real para validar la hora ingresada
      const avail = await getAvailableHoursForCourt(
        session.date!,
        String(session.cancha!),
        async (cId, dayStart, dayEnd) => {
          const rows = await this.bookings.findByCourtAndDateRange(String(cId), dayStart, dayEnd);
          return rows.map(r => ({ startTime: r.startTime, endTime: r.endTime }));
        },
        { open: BUSINESS.open, close: BUSINESS.close, slotMinutes: BUSINESS.slotMinutes }
      );

      if (!avail.includes(payload)) {
        const shown = ymdToDmy(session.date!);
        if (!avail.length) {
          await this.messenger.sendText(
            from,
            `No hay horarios disponibles para *${shown}*.\nEscribe "mañana" o una fecha (DD-MM-AAAA).`
          );
          return;
        }
        await this.messenger.sendText(
          from,
          `Esa hora no está disponible para *${shown}*.\nDisponibles: ${avail.join(', ')}\nEnvía una hora válida (HH:mm).`
        );
        return;
      }

      session.time = payload;
      await this.setSession(from, session);

      // Instantes con TZ (UTC al guardar)
      const { start, end } = makeStartEndTZ(session.date!, session.time!, TZ);

      // Solape final (carrera)
      const overlaps = await this.bookings.findByCourtAndDateRange(
        String(session.cancha!),
        start,
        end,
      );
      if (overlaps.length > 0) {
        await this.messenger.sendText(
          from,
          `⚠️ Ese horario se ocupó recién para la cancha ${session.cancha}. Elige otra *hora* (HH:mm) o cambia la fecha.`
        );
        return;
      }

      // Crear reserva
      const toCreate: any = {
        contactId: session.contactId!,
        courtId: Number(session.cancha!),
        paymentId: null,
        userId: null,
        startTime: start,
        endTime: end,
        status: 'pending',
        date: session.date!, // YYYY-MM-DD
      };
      try {
        await this.bookings.create(toCreate);
        await this.messenger.sendText(
          from,
          `✅ *Reserva guardada*\n• Cancha: ${session.cancha}\n• Fecha: ${ymdToDmy(session.date!)}\n• Hora: ${session.time}\n\nEscribe "menu" para nueva reserva o "cancelar" para salir.`
        );
        await this.clearSession(from);
      } catch (e: any) {
        if (e?.code === '23505' || /duplicate key value/i.test(e?.message || '')) {
          await this.messenger.sendText(
            from,
            `⚠️ Ese horario ya está reservado para la cancha ${session.cancha}. Elige otra hora.`
          );
        } else {
          console.error('[DB][BOOKING] Error:', e);
          await this.messenger.sendText(
            from,
            '❌ Error al guardar la reserva. Intenta en unos minutos.'
          );
        }
      }
      return;
    }

    // Fallback
    await this.messenger.sendText(
      from,
      'No entendí. Escribe "menu" para reservar.\nFlujo: cancha (botón) → fecha (botón/texto DD-MM-AAAA) → hora (texto HH:mm).',
    );
  }
}
