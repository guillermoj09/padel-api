// src/whatsapp/application/flows/reservation.flow.ts
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import {
  localTodayYMD,
  localTomorrowYMD,
  isValidHHmm,
  makeStartEndTZ,
  getAvailableHoursForCourt,
  TZ,
} from '../services/time.utils';
import { ymdToDmy, reDateDMY, dmyToYmd } from './helpers';

const BUSINESS = { open: '07:00', close: '23:00', slotMinutes: 60 };
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

export class ReservationFlow {
  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    private readonly bookings: BookingRepository,
  ) {}

  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }

  private async sendAvailability(
    from: string,
    ymd: string,
    courtId: string | number,
  ) {
    const slots = await getAvailableHoursForCourt(
      ymd,
      courtId,
      async (cId, dayStart, dayEnd) => {
        const rows = await this.bookings.findByCourtAndDateRange(
          String(cId),
          dayStart,
          dayEnd,
        );
        return rows.map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
        }));
      },
      {
        open: BUSINESS.open,
        close: BUSINESS.close,
        slotMinutes: BUSINESS.slotMinutes,
      },
    );

    const shown = ymdToDmy(ymd);
    if (!slots.length) {
      await this.messenger.sendText(
        from,
        `No hay horarios disponibles para *${shown}*.\nEscribe "mañana" o una fecha (DD-MM-AAAA).`,
      );
      return;
    }
    await this.messenger.sendText(
      from,
      `📅 Fecha *${shown}* seleccionada.\nHorarios disponibles: ${slots.join(', ')}\n\nEscribe la *hora* (HH:mm, 24h).`,
    );
  }

  async start(from: string, session: Session) {
    session.step = 'choose_cancha';
    await this.setSession(from, session);
    await this.messenger.sendButtons(from, 'Elige la cancha:', CANCHA_BTNS);
  }

  async chooseCancha(from: string, session: Session, payload: string) {
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
  }

  async chooseDate(from: string, session: Session, payload: string) {
    if (payload === 'date_today') session.date = localTodayYMD();
    else if (payload === 'date_tomorrow') session.date = localTomorrowYMD();
    else if (payload === 'date_other') {
      session.step = 'awaiting_other_date';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        'Escribe la fecha en formato **DD-MM-AAAA** (ej: 21-08-2025).',
      );
      return;
    } else {
      return;
    }

    session.step = 'choose_time';
    await this.setSession(from, session);
    await this.sendAvailability(from, session.date, String(session.cancha!));
  }

  async awaitingOtherDate(from: string, session: Session, payload: string) {
    if (!reDateDMY.test(payload)) {
      await this.messenger.sendText(
        from,
        'Formato inválido. Usa **DD-MM-AAAA** (ej: 21-08-2025).',
      );
      return;
    }
    session.date = dmyToYmd(payload);
    session.step = 'choose_time';
    await this.setSession(from, session);
    await this.sendAvailability(from, session.date, String(session.cancha!));
  }

  async chooseTime(from: string, session: Session, payload: string) {
    if (!isValidHHmm(payload)) {
      await this.messenger.sendText(
        from,
        'Hora inválida. Usa HH:mm (24h), ej: 18:30',
      );
      return;
    }

    const avail = await getAvailableHoursForCourt(
      session.date!,
      String(session.cancha!),
      async (cId, dayStart, dayEnd) => {
        const rows = await this.bookings.findByCourtAndDateRange(
          String(cId),
          dayStart,
          dayEnd,
        );
        return rows.map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
        }));
      },
      {
        open: BUSINESS.open,
        close: BUSINESS.close,
        slotMinutes: BUSINESS.slotMinutes,
      },
    );

    if (!avail.includes(payload)) {
      const shown = ymdToDmy(session.date!);
      if (!avail.length) {
        await this.messenger.sendText(
          from,
          `No hay horarios disponibles para *${shown}*.\nEscribe "mañana" o una fecha (DD-MM-AAAA).`,
        );
        return;
      }
      await this.messenger.sendText(
        from,
        `Esa hora no está disponible para *${shown}*.\nDisponibles: ${avail.join(', ')}\nEnvía una hora válida (HH:mm).`,
      );
      return;
    }

    // 💡 hasta aquí está todo igual: ya tenemos hora válida
    session.time = payload;

    // si ya tenía un nombre de la reserva anterior, damos opción de usarlo
    if (session.reservationName) {
      session.step = 'ask_name';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        `Tengo este nombre guardado: *${session.reservationName}*.\nEscribe **mismo** para usarlo, o escribe un nombre nuevo.`,
      );
      return;
    }

    // primera vez: pedir nombre
    session.step = 'ask_name';
    await this.setSession(from, session);
    await this.messenger.sendText(from, '¿A nombre de quién va la reserva? ✍️');
  }

  // 👇 nuevo método
  async askNameAndCreate(from: string, session: Session, payload: string) {
    const typed = (payload ?? '').trim();

    // permitir "mismo" para reutilizar el anterior
    let name: string | undefined;
    if (typed.toLowerCase() === 'mismo') {
      name = session.reservationName;
    } else if (typed) {
      name = typed;
    } else {
      name = session.reservationName;
    }

    if (!name) {
      await this.messenger.sendText(
        from,
        'Necesito el nombre de la reserva 📝 (puedes poner "mismo").',
      );
      return;
    }

    // guardamos para futuras reservas
    session.reservationName = name;
    await this.setSession(from, session);

    const { start, end } = makeStartEndTZ(session.date!, session.time!, TZ);

    // doble check por si se ocupó
    const overlaps = await this.bookings.findByCourtAndDateRange(
      String(session.cancha!),
      start,
      end,
    );
    if (overlaps.length > 0) {
      await this.messenger.sendText(
        from,
        `⚠️ Ese horario se ocupó recién para la cancha ${session.cancha}. Elige otra *hora* (HH:mm) o cambia la fecha.`,
      );
      session.step = 'choose_time';
      await this.setSession(from, session);
      return;
    }

    const toCreate: any = {
      contactId: session.contactId ?? null,
      courtId: Number(session.cancha!),
      paymentId: null,
      userId: null,
      startTime: start,
      endTime: end,
      status: 'pending',
      date: session.date!,
      title: name, // 👈 aquí metemos el nombre
    };

    try {
      await this.bookings.create(toCreate);
      await this.messenger.sendText(
        from,
        `✅ *Reserva guardada*\n• Nombre: ${name}\n• Cancha: ${session.cancha}\n• Fecha: ${ymdToDmy(session.date!)}\n• Hora: ${session.time}\n\nEscribe "menu" para nueva reserva o "cancelar" para salir.`,
      );
      await this.sessions.del(from);
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
  }
}
