import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import { ConflictException } from '@nestjs/common';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { CreateBookingUseCase } from '../../../events/application/use-cases/create-booking.use-case';
import { BookingStatus, PaymentMethod } from '../../../events/domain/entities/booking';
import { CourtPricingRepository } from '../../../events/domain/repositories/court-pricing.repository';
import {
  localTodayYMD,
  localTomorrowYMD,
  isValidHHmm,
  makeStartEndTZ,
  getAvailableHoursForCourt,
  TZ,
} from '../services/time.utils';
import { ymdToDmy, reDateDMY, dmyToYmd } from './helpers';
import { CourtsReaderPort } from '../../../courts/domain/ports/courts-reader.port';

const BUSINESS_AM = { open: '07:00', close: '13:00', slotMinutes: 90 };
const BUSINESS_PM = { open: '17:00', close: '23:00', slotMinutes: 90 };

const DATE_BTNS = [
  { id: 'date_today', title: 'Hoy' },
  { id: 'date_tomorrow', title: 'Mañana' },
  { id: 'date_other', title: 'Otro día' },
];

const CONFIRM_BTNS = [{ id: 'CONFIRM_BOOKING', title: 'Confirmar reserva' }];

export class ReservationFlow {
  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    private readonly bookings: BookingRepository,
    private readonly createBooking: CreateBookingUseCase,
    private readonly courtsReader: CourtsReaderPort,
    private readonly pricingRepo: CourtPricingRepository,
  ) {}

  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }

  private async listActiveCourts() {
    return this.courtsReader.list({ active: true, limit: 10 });
  }

  private async buildCourtButtons() {
    const courts = await this.listActiveCourts();

    return courts.slice(0, 3).map((court) => ({
      id: `cancha_${court.id}`,
      title: court.name,
    }));
  }

  private async getCourtLabel(cancha?: number | null): Promise<string> {
    if (!cancha) return '-';

    const court = await this.courtsReader.getById(cancha);
    return court?.name ?? `Cancha ${cancha}`;
  }

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private resolveSlotByCutoff(
    time: string,
    cutoff?: string | null,
  ): 'AM' | 'PM' {
    const mins = this.hhmmToMinutes(time);

    if (!cutoff) {
      return mins < 13 * 60 ? 'AM' : 'PM';
    }

    return mins < this.hhmmToMinutes(cutoff) ? 'AM' : 'PM';
  }

  private async fillPricePreview(session: Session): Promise<void> {
    if (!session.cancha || !session.date || !session.time) return;

    const pricing = await this.pricingRepo.getPricingFor(
      Number(session.cancha),
      session.date,
    );

    const slot = this.resolveSlotByCutoff(session.time, pricing.cutoff);
    const priceApplied = slot === 'AM' ? pricing.amPrice : pricing.pmPrice;

    session.priceApplied = priceApplied;
    session.currencyApplied = pricing.currency;
    session.pricingSource = pricing.source;
    session.slotApplied = slot;
    session.cutoffApplied = pricing.cutoff;
  }

  private getSessionPriceText(session: Session): string {
    const value =
      session.priceApplied ??
      (session as any).price ??
      (session as any).total ??
      (session as any).totalApplied ??
      (session as any).amount ??
      null;

    const currency =
      session.currencyApplied ??
      (session as any).currency ??
      (session as any).priceCurrency ??
      '';

    if (value === null || value === undefined || value === '') {
      return 'Por definir';
    }

    return `${value}${currency ? ` ${currency}` : ''}`;
  }

  private async buildConfirmationMessage(session: Session): Promise<string> {
    const name = session.reservationName ?? '-';
    const cancha = await this.getCourtLabel(session.cancha);
    const date = session.date ? ymdToDmy(session.date) : '-';
    const time = session.time ?? '-';
    const price = this.getSessionPriceText(session);

    return (
      `📋 *Confirma tu reserva*\n\n` +
      `👤 Nombre: ${name}\n` +
      `🎾 Cancha: ${cancha}\n` +
      `📅 Fecha: ${date}\n` +
      `🕒 Hora: ${time}\n` +
      `💵 Precio: ${price}\n\n` +
      `Pulsa el botón para confirmar.\n\nEscribe *atras* para volver.`
    );
  }

  private async getAvailableSlots(ymd: string, courtId: string | number) {
    const fetchBookings = async (
      cId: string | number,
      dayStart: Date,
      dayEnd: Date,
    ) => {
      const rows = await this.bookings.findByCourtAndDateRange(
        String(cId),
        dayStart,
        dayEnd,
      );

      return rows.map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
      }));
    };

    const slotsAM = await getAvailableHoursForCourt(
      ymd,
      courtId,
      fetchBookings,
      BUSINESS_AM,
    );

    const slotsPM = await getAvailableHoursForCourt(
      ymd,
      courtId,
      fetchBookings,
      BUSINESS_PM,
    );

    return [...slotsAM, ...slotsPM];
  }
  private async sendAvailability(
    from: string,
    session: Session,
    ymd: string,
    courtId: string | number,
  ) {
    const slots = await this.getAvailableSlots(ymd, courtId);
    const shown = ymdToDmy(ymd);

    if (!slots.length) {
      session.step = 'awaiting_other_date';
      await this.setSession(from, session);

      await this.messenger.sendText(
        from,
        `😕 No hay horarios disponibles para *${shown}*.\n\n` +
          `Escribe *mañana* o una nueva fecha en formato *DD-MM-AAAA*.\n` +
          `Ejemplo: *25-03-2026*`,
      );
      return;
    }

    const amSlots = slots.filter((h) => this.hhmmToMinutes(h) < 13 * 60);
    const pmSlots = slots.filter((h) => this.hhmmToMinutes(h) >= 13 * 60);

    const amBlock = amSlots.length
      ? `🌞 *Turno AM:*\n${amSlots.map((h) => `• ${h}`).join('\n')}`
      : `🌞 *Turno AM:*\n• Sin horarios disponibles`;

    const pmBlock = pmSlots.length
      ? `🌙 *Turno PM:*\n${pmSlots.map((h) => `• ${h}`).join('\n')}`
      : `🌙 *Turno PM:*\n• Sin horarios disponibles`;

    await this.messenger.sendText(
      from,
      `📅 *Fecha seleccionada:* ${shown}\n\n` +
        `${amBlock}\n\n` +
        `${pmBlock}\n\n` +
        `Escribe la hora que quieres reservar en formato *HH:mm*.\n` +
        `Ejemplo: *18:30*\n\n` +
        `Escribe *atras* para volver.`,
    );
  }

  async goBack(from: string, session: Session) {
    switch (session.step) {
      case 'choose_date':
        return this.backToCancha(from, session);

      case 'awaiting_other_date':
        return this.backToDate(from, session);

      case 'choose_time':
        return this.backToDate(from, session);

      case 'ask_name':
        return this.backToTime(from, session);

      case 'confirm_booking':
        return this.backToName(from, session);

      default:
        await this.messenger.sendText(
          from,
          'No hay un paso anterior al que volver.\nEscribe *menu* para comenzar de nuevo.',
        );
        return;
    }
  }

  private async backToCancha(from: string, session: Session) {
    session.step = 'choose_cancha';
    delete session.cancha;
    delete session.date;
    delete session.time;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;

    await this.setSession(from, session);

    const canchaBtns = await this.buildCourtButtons();

    await this.messenger.sendButtons(
      from,
      'Volvimos al paso de canchas 👌\nElige la cancha:',
      canchaBtns,
    );
  }

  private async backToDate(from: string, session: Session) {
    session.step = 'choose_date';
    delete session.date;
    delete session.time;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;

    await this.setSession(from, session);

    await this.messenger.sendButtons(
      from,
      'Volvimos al paso de fecha 👌\nAhora elige la fecha:',
      DATE_BTNS,
    );
  }

  private async backToTime(from: string, session: Session) {
    if (!session.date || !session.cancha) {
      return this.backToDate(from, session);
    }

    session.step = 'choose_time';
    delete session.time;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;
    delete session.reservationName;

    await this.setSession(from, session);

    await this.sendAvailability(
      from,
      session,
      session.date,
      String(session.cancha),
    );
  }

  private async backToName(from: string, session: Session) {
    session.step = 'ask_name';
    await this.setSession(from, session);

    await this.messenger.sendText(
      from,
      'Volvimos al paso del nombre 👌\nEscribe el nombre de la reserva o escribe *mismo*.',
    );
  }

  async start(from: string, session: Session) {
    const canchaBtns = await this.buildCourtButtons();

    if (!canchaBtns.length) {
      await this.messenger.sendText(
        from,
        'No hay canchas activas disponibles en este momento.',
      );
      return;
    }

    session.step = 'choose_cancha';
    await this.setSession(from, session);
    await this.messenger.sendButtons(from, 'Elige la cancha:', canchaBtns);
  }

  async chooseCancha(from: string, session: Session, payload: string) {
    const num = Number(payload.split('_')[1]);

    if (!Number.isFinite(num)) {
      const canchaBtns = await this.buildCourtButtons();
      await this.messenger.sendButtons(
        from,
        'No pude identificar esa cancha 😅\nElige una de las opciones disponibles.',
        canchaBtns,
      );
      return;
    }

    const court = await this.courtsReader.getById(num);

    if (!court) {
      const canchaBtns = await this.buildCourtButtons();
      await this.messenger.sendButtons(
        from,
        'No pude identificar esa cancha 😅\nElige una de las opciones disponibles.',
        canchaBtns,
      );
      return;
    }

    session.cancha = num;
    session.amPrice = court.defaultAmPrice ?? 0;
    session.pmPrice = court.defaultPmPrice ?? 0;
    session.currency = court.currency ?? 'CLP';
    session.cutoff = court.priceCutoff ?? null;
    session.pricingSource = 'COURT_DEFAULT';
    session.pricePreview = null;

    session.step = 'choose_date';
    await this.setSession(from, session);

    await this.messenger.sendButtons(
      from,
      `${court.name} seleccionada ✅\n` +
        `Tarifa AM: ${session.amPrice} ${session.currency}\n` +
        `Tarifa PM: ${session.pmPrice} ${session.currency}\n\n` +
        `Ahora elige la fecha:`,
      DATE_BTNS,
    );
  }

  async chooseDate(from: string, session: Session, payload: string) {
    if (payload === 'date_today') {
      session.date = localTodayYMD();
    } else if (payload === 'date_tomorrow') {
      session.date = localTomorrowYMD();
    } else if (payload === 'date_other') {
      session.step = 'awaiting_other_date';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        'Escríbeme la fecha en formato **DD-MM-AAAA**.\nEjemplo: 25-03-2026\n\nEscribe *atras* para volver.',
      );
      return;
    } else {
      return;
    }

    session.step = 'choose_time';
    await this.setSession(from, session);
    await this.sendAvailability(
      from,
      session,
      session.date,
      String(session.cancha!),
    );
  }

  async awaitingOtherDate(from: string, session: Session, payload: string) {
    const p = (payload ?? '').trim().toLowerCase();

    if (p === 'mañana' || p === 'manana') {
      session.date = localTomorrowYMD();
      session.step = 'choose_time';
      await this.setSession(from, session);
      await this.sendAvailability(
        from,
        session,
        session.date,
        String(session.cancha!),
      );
      return;
    }

    if (!reDateDMY.test(payload)) {
      await this.messenger.sendText(
        from,
        'No entendí la fecha 😅\nEscríbela en formato **DD-MM-AAAA** o escribe **mañana**.\nEjemplo: 25-03-2026\n\nEscribe *atras* para volver.',
      );
      return;
    }

    session.date = dmyToYmd(payload);
    session.step = 'choose_time';
    await this.setSession(from, session);
    await this.sendAvailability(
      from,
      session,
      session.date,
      String(session.cancha!),
    );
  }

  async chooseTime(from: string, session: Session, payload: string) {
    if (!isValidHHmm(payload)) {
      await this.messenger.sendText(
        from,
        'No entendí la hora 😅\nEscríbela en formato **HH:mm**.\nEjemplo: 18:30',
      );
      return;
    }

    const avail = await this.getAvailableSlots(
      session.date!,
      String(session.cancha!),
    );

    if (!avail.includes(payload)) {
      const shown = ymdToDmy(session.date!);

      if (!avail.length) {
        session.step = 'awaiting_other_date';
        await this.setSession(from, session);

        await this.messenger.sendText(
          from,
          `No hay horarios disponibles para *${shown}*.\nEscribe **mañana** o una nueva fecha en formato **DD-MM-AAAA**.`,
        );
        return;
      }

      await this.messenger.sendText(
        from,
        `Esa hora ya no está disponible.\nHoras libres para *${shown}*: ${avail.join(', ')}\n\nEscribe una de esas horas en formato **HH:mm**.\n\nEscribe *atras* para volver.`,
      );
      return;
    }

    session.time = payload;
    await this.fillPricePreview(session);

    if (session.reservationName) {
      session.step = 'ask_name';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        `Tengo este nombre guardado: *${session.reservationName}*.\nEscribe **mismo** para usarlo o envía un nombre nuevo.\n\nEscribe *atras* para volver.`,
      );
      return;
    }

    session.step = 'ask_name';
    await this.setSession(from, session);
    await this.messenger.sendText(
      from,
      '¿A nombre de quién va la reserva? ✍️\n\nEscribe *atras* para volver.',
    );
  }

  async askNameAndPrepareConfirmation(
    from: string,
    session: Session,
    payload: string,
  ) {
    const typed = (payload ?? '').trim();

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
        'Me falta el nombre de la reserva 🙂\nEscríbelo para continuar.',
      );
      return;
    }

    session.reservationName = name;
    session.step = 'confirm_booking';
    await this.setSession(from, session);

    await this.messenger.sendButtons(
      from,
      await this.buildConfirmationMessage(session),
      CONFIRM_BTNS,
    );
  }

  async confirmBooking(from: string, session: Session) {
    if (
      !session.date ||
      !session.time ||
      !session.cancha ||
      !session.reservationName
    ) {
      await this.sessions.del(from);
      await this.messenger.sendText(
        from,
        'Faltan datos para completar la reserva.\nEscribe **menu** para comenzar de nuevo.',
      );
      return;
    }

    const avail = await this.getAvailableSlots(
      session.date,
      String(session.cancha),
    );

    if (!avail.includes(session.time)) {
      await this.messenger.sendText(
        from,
        `⚠️ Ese horario ya no está disponible.\nDisponibles: ${avail.join(', ') || 'sin horarios'}\n\nElige otra hora en formato **HH:mm**.`,
      );
      session.step = 'choose_time';
      await this.setSession(from, session);
      return;
    }

    const durationMinutes =
      this.hhmmToMinutes(session.time) < 13 * 60
        ? BUSINESS_AM.slotMinutes
        : BUSINESS_PM.slotMinutes;

    const { start, end } = makeStartEndTZ(
      session.date,
      session.time,
      TZ,
      durationMinutes,
    );

    try {
      const created = await this.createBooking.execute({
        contactId: session.contactId ?? null,
        courtId: Number(session.cancha),
        paymentId: null,
        paymentMethod: PaymentMethod.Pendiente,
        userId: null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: BookingStatus.Confirmed,
        date: session.date,
        title: session.reservationName,
      });

      await this.messenger.sendText(
        from,
        `✅ *Reserva guardada*\n` +
          `• Nombre: ${session.reservationName}\n` +
          `• Cancha: ${await this.getCourtLabel(session.cancha)}\n` +
          `• Fecha: ${ymdToDmy(session.date)}\n` +
          `• Hora: ${session.time}\n` +
          `• Precio: ${created.priceApplied} ${created.currencyApplied ?? ''}\n\n` +
          `Escribe **menu** para una nueva reserva o **cancelar** para salir.`,
      );

      await this.sessions.del(from);
    } catch (e: any) {
      const msg = e?.response?.message ?? e?.message;

      if (e instanceof ConflictException || e?.status === 409) {
        await this.messenger.sendText(
          from,
          `⚠️ No se pudo crear la reserva: ${
            Array.isArray(msg) ? msg.join(', ') : msg
          }\n\nElige otra hora o cambia la fecha.`,
        );
        session.step = 'choose_time';
        await this.setSession(from, session);
        return;
      }

      if (
        e?.code === '23505' ||
        /duplicate key value/i.test(e?.message || '')
      ) {
        await this.messenger.sendText(
          from,
          `⚠️ Ese horario ya está reservado.\nElige otra hora disponible.`,
        );
        session.step = 'choose_time';
        await this.setSession(from, session);
        return;
      }

      console.error('[WHATSAPP][CREATE_BOOKING] Error:', e);
      await this.messenger.sendText(
        from,
        '❌ Ocurrió un error al guardar la reserva.\nIntenta de nuevo en unos minutos.',
      );
    }
  }
}
