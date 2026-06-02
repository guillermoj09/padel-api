import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import { ConflictException } from '@nestjs/common';
import { CreateBookingUseCase } from '../../../events/application/use-cases/create-booking.use-case';
import { BookingStatus, PaymentMethod } from '../../../events/domain/entities/booking';
import { CourtPricingRepository } from '../../../events/domain/repositories/court-pricing.repository';
import {
  localTodayYMD,
  localTomorrowYMD,
  isValidDMY,
  isValidHHmm,
  isPastLocalYMD,
} from '../services/time.utils';
import { ymdToDmy, dmyToYmd } from './helpers';
import { CourtsReaderPort } from '../../../courts/domain/ports/courts-reader.port';
import { Court } from '../../../courts/domain/entities/court';
import { CourtAvailabilityService } from '../../../courts/application/services/court-availability.service';
import { ReservationFlowConfig } from './reservation.config';

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
    private readonly createBooking: CreateBookingUseCase,
    private readonly courtsReader: CourtsReaderPort,
    private readonly pricingRepo: CourtPricingRepository,
    private readonly availability: CourtAvailabilityService,
    private readonly config: ReservationFlowConfig,
  ) {}

  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }

  private normalizeText(value?: string | null): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private get sportLabel(): string {
    return this.config.sportLabel;
  }

  private get sportIcon(): string {
    return this.config.sportIcon;
  }

  private sportSuffix(): string {
    return ` de ${this.sportLabel}`;
  }

  private matchesConfiguredCourtType(courtType?: string | null): boolean {
    return (
      this.normalizeText(courtType) === this.normalizeText(this.config.courtType)
    );
  }

  private async listActiveCourts(): Promise<Court[]> {
    return this.courtsReader.list({
      active: true,
      limit: 100,
      type: this.config.courtType,
    });
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

  private normalizeHourInput(payload: string): string | null {
    const raw = String(payload ?? '').trim().replace('.', ':');

    let candidate = raw;

    if (/^\d{1,2}$/.test(raw)) {
      candidate = `${raw.padStart(2, '0')}:00`;
    } else if (/^\d{3,4}$/.test(raw)) {
      const padded = raw.padStart(4, '0');
      candidate = `${padded.slice(0, 2)}:${padded.slice(2)}`;
    } else if (/^\d{1,2}:\d{1,2}$/.test(raw)) {
      const [h, m] = raw.split(':');
      candidate = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }

    return isValidHHmm(candidate) ? candidate : null;
  }

  private sortSlots(slots: string[]): string[] {
    return [...new Set(slots)].sort(
      (a, b) => this.hhmmToMinutes(a) - this.hhmmToMinutes(b),
    );
  }

  private async getAvailableSlotsAcrossCourts(ymd: string): Promise<string[]> {
    const blocks = await this.availability.getAvailableHours(
      this.config.courtType,
      ymd,
    );

    return this.sortSlots(
      blocks.flatMap((block) => block.slots.map((slot) => slot.time)),
    );
  }

  private async getAvailableCourtsForTime(
    ymd: string,
    time: string,
  ): Promise<Court[]> {
    const result = await this.availability.getAvailableCourtsForTime(
      this.config.courtType,
      ymd,
      time,
    );

    return result.courts;
  }

  private async buildAvailableCourtOptionsForTime(ymd: string, time: string) {
    const result = await this.availability.getAvailableCourtsForTime(
      this.config.courtType,
      ymd,
      time,
    );
    const priceSlotFromWindow = result.window?.priceSlot ?? null;

    return Promise.all(
      result.courts.map(async (court) => {
        const pricing = await this.pricingRepo.getPricingFor(court.id, ymd);
        const slot =
          priceSlotFromWindow ?? this.resolveSlotByCutoff(time, pricing.cutoff);
        const priceApplied = slot === 'AM' ? pricing.amPrice : pricing.pmPrice;

        return {
          id: `cancha_${court.id}`,
          title: court.name,
          description: `Precio ${slot} ${priceApplied} ${pricing.currency ?? court.currency ?? 'CLP'}`,
          courtId: court.id,
        };
      }),
    );
  }

  private async fillPricePreview(session: Session): Promise<void> {
    if (!session.cancha || !session.date || !session.time) return;

    const pricing = await this.pricingRepo.getPricingFor(
      Number(session.cancha),
      session.date,
    );
    const window = await this.availability.resolveWindowByTime(
      this.config.courtType,
      session.time,
    );

    const slot =
      window?.priceSlot ?? this.resolveSlotByCutoff(session.time, pricing.cutoff);
    const priceApplied = slot === 'AM' ? pricing.amPrice : pricing.pmPrice;

    session.priceApplied = priceApplied;
    session.currencyApplied = pricing.currency;
    session.pricingSource = pricing.source;
    session.slotApplied = slot;
    session.cutoffApplied = window?.priceSlot ? null : pricing.cutoff;
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
      `${this.sportIcon} *Confirma tu reserva de ${this.sportLabel}*\n\n` +
      `👤 Nombre: ${name}\n` +
      `🏟️ Cancha: ${cancha}\n` +
      `📅 Fecha: ${date}\n` +
      `🕒 Hora: ${time}\n` +
      `💵 Precio: ${price}\n\n` +
      `Pulsa el botón para confirmar.\n\nEscribe *atras* para volver.`
    );
  }

  private async sendAvailabilityAcrossCourts(
    from: string,
    session: Session,
    ymd: string,
  ) {
    const courts = await this.listActiveCourts();
    const blocks = await this.availability.getAvailableHours(
      this.config.courtType,
      ymd,
    );
    const slots = this.sortSlots(
      blocks.flatMap((block) => block.slots.map((slot) => slot.time)),
    );
    const shown = ymdToDmy(ymd);

    if (!courts.length) {
      await this.messenger.sendText(
        from,
        `No hay canchas${this.sportSuffix()} activas disponibles en este momento.`,
      );
      return;
    }

    if (!blocks.length) {
      await this.messenger.sendText(
        from,
        `No hay horarios configurados para ${this.sportLabel}.\n` +
          `Revisa la tabla *court_schedule_windows*.`,
      );
      return;
    }

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

    const blockTexts = blocks.map(({ window, slots: blockSlots }) => {
      const emoji = window.emoji ?? '🕒';

      if (!blockSlots.length) {
        return `${emoji} *${window.label}* · Tarifa ${window.priceSlot}:\n• Sin horarios disponibles`;
      }

      return `${emoji} *${window.label}* · Tarifa ${window.priceSlot}:\n${blockSlots
        .map((slot) => `• ${slot.time}`)
        .join('\n')}`;
    });

    await this.messenger.sendText(
      from,
      `📅 *Fecha seleccionada:* ${shown}\n\n` +
        `${blockTexts.join('\n\n')}\n\n` +
        `Estos horarios tienen al menos una cancha disponible.\n` +
        `Escribe la hora que quieres reservar.\n` +
        `Ejemplos: *8*, *08:00*, *18:30*\n\n` +
        `Escribe *atras* para volver.`,
    );
  }

  private async sendAvailableCourtPickerForTime(
    from: string,
    session: Session,
    body?: string,
  ) {
    if (!session.date || !session.time) {
      return this.backToDate(from, session);
    }

    const options = await this.buildAvailableCourtOptionsForTime(
      session.date,
      session.time,
    );

    if (!options.length) {
      session.step = 'choose_time';
      delete session.cancha;
      delete session.availableCourtIds;
      await this.setSession(from, session);

      const avail = await this.getAvailableSlotsAcrossCourts(session.date);
      const shown = ymdToDmy(session.date);

      await this.messenger.sendText(
        from,
        `Ese horario ya no tiene canchas disponibles para *${shown}*.\n` +
          `Horas disponibles: ${avail.join(', ') || 'sin horarios'}\n\n` +
          `Elige otra hora.\n\n` +
          `Escribe *atras* para volver.`,
      );
      return;
    }

    session.step = 'choose_court_for_time';
    session.availableCourtIds = options.map((option) => option.courtId);
    delete session.cancha;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;
    await this.setSession(from, session);

    const message =
      body ??
      `🕒 Hora seleccionada: *${session.time}*\n\n` +
        `Estas canchas están disponibles para ese horario:`;

    if (options.length <= 3 || !this.messenger.sendList) {
      await this.messenger.sendButtons(
        from,
        `${message}\n\nElige una cancha.`,
        options.slice(0, 3).map(({ id, title }) => ({ id, title })),
      );
      return;
    }

    await this.messenger.sendList(from, {
      header: `${this.sportIcon} Canchas disponibles`,
      body: `${message}\n\nElige una cancha.`,
      footer: 'Solo se muestran canchas libres para esa fecha y hora.',
      buttonText: 'Ver canchas',
      sections: [
        {
          title: `Disponibles ${session.time}`,
          rows: options.slice(0, 10),
        },
      ],
    });
  }

  async goBack(from: string, session: Session) {
    switch (session.step) {
      case 'choose_date':
        await this.messenger.sendText(
          from,
          'Ya estás en el primer paso de la reserva.\nEscribe *menu* para volver al menú principal.',
        );
        return;

      case 'awaiting_other_date':
        return this.backToDate(from, session);

      case 'choose_time':
        return this.backToDate(from, session);

      case 'choose_court_for_time':
        return this.backToTime(from, session);

      case 'ask_name':
        return this.backToCourtForTime(from, session);

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

  private async backToDate(from: string, session: Session) {
    session.step = 'choose_date';
    delete session.cancha;
    delete session.date;
    delete session.time;
    delete session.availableCourtIds;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;

    await this.setSession(from, session);

    await this.messenger.sendButtons(
      from,
      `Volvimos al paso de fecha 👌\nAhora elige la fecha para tu reserva de ${this.sportLabel}:`,
      DATE_BTNS,
    );
  }

  private async backToTime(from: string, session: Session) {
    if (!session.date) {
      return this.backToDate(from, session);
    }

    session.step = 'choose_time';
    delete session.time;
    delete session.cancha;
    delete session.availableCourtIds;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;
    delete session.reservationName;

    await this.setSession(from, session);

    await this.sendAvailabilityAcrossCourts(from, session, session.date);
  }

  private async backToCourtForTime(from: string, session: Session) {
    if (!session.date || !session.time) {
      return this.backToTime(from, session);
    }

    delete session.cancha;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;
    delete session.reservationName;

    await this.sendAvailableCourtPickerForTime(
      from,
      session,
      `Volvimos al paso de canchas 👌\n` +
        `Estas canchas están disponibles para *${session.time}*:`,
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
    const courts = await this.listActiveCourts();

    if (!courts.length) {
      await this.messenger.sendText(
        from,
        `No hay canchas${this.sportSuffix()} activas disponibles en este momento.`,
      );
      return;
    }

    session.step = 'choose_date';
    session.flowType = this.config.flowKey;
    delete session.cancha;
    delete session.date;
    delete session.time;
    delete session.availableCourtIds;
    delete session.priceApplied;
    delete session.currencyApplied;
    delete session.slotApplied;
    delete session.cutoffApplied;
    await this.setSession(from, session);

    await this.messenger.sendButtons(
      from,
      `${this.sportIcon} Reserva de ${this.sportLabel}\n\n` +
        `Primero elige la fecha. Después te mostraré los horarios y las canchas disponibles para ese horario.`,
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
      await this.messenger.sendButtons(
        from,
        'No entendí la fecha 😅\nElige una de las opciones disponibles.',
        DATE_BTNS,
      );
      return;
    }

    session.step = 'choose_time';
    delete session.cancha;
    delete session.availableCourtIds;
    await this.setSession(from, session);
    await this.sendAvailabilityAcrossCourts(from, session, session.date);
  }

  async awaitingOtherDate(from: string, session: Session, payload: string) {
    const p = (payload ?? '').trim().toLowerCase();

    if (p === 'mañana' || p === 'manana') {
      session.date = localTomorrowYMD();
      session.step = 'choose_time';
      delete session.cancha;
      delete session.availableCourtIds;
      await this.setSession(from, session);
      await this.sendAvailabilityAcrossCourts(from, session, session.date);
      return;
    }

    if (!isValidDMY(payload)) {
      await this.messenger.sendText(
        from,
        'No entendí la fecha 😅\nEscríbela en formato **DD-MM-AAAA** o escribe **mañana**.\nEjemplo: 25-03-2026\n\nEscribe *atras* para volver.',
      );
      return;
    }

    const parsedYmd = dmyToYmd(payload);

    if (isPastLocalYMD(parsedYmd)) {
      await this.messenger.sendText(
        from,
        'Esa fecha ya pasó 😅\nEscríbeme una fecha de hoy en adelante en formato **DD-MM-AAAA** o escribe **mañana**.',
      );
      return;
    }

    session.date = parsedYmd;
    session.step = 'choose_time';
    delete session.cancha;
    delete session.availableCourtIds;
    await this.setSession(from, session);
    await this.sendAvailabilityAcrossCourts(from, session, session.date);
  }

  async chooseTime(from: string, session: Session, payload: string) {
    if (!session.date) {
      return this.backToDate(from, session);
    }

    const normalizedTime = this.normalizeHourInput(payload);

    if (!normalizedTime) {
      await this.messenger.sendText(
        from,
        'No entendí la hora 😅\nPuedes escribirla como **8**, **08:00** o **18:30**.',
      );
      return;
    }

    const avail = await this.getAvailableSlotsAcrossCourts(session.date);

    if (!avail.includes(normalizedTime)) {
      const shown = ymdToDmy(session.date);

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
        `Esa hora no está disponible para ninguna cancha.\n` +
          `Horas libres para *${shown}*: ${avail.join(', ')}\n\n` +
          `Escribe una de esas horas.\n\n` +
          `Escribe *atras* para volver.`,
      );
      return;
    }

    session.time = normalizedTime;
    await this.sendAvailableCourtPickerForTime(from, session);
  }

  async chooseCourtForTime(from: string, session: Session, payload: string) {
    if (!session.date || !session.time) {
      return this.backToDate(from, session);
    }

    const num = Number(payload.split('_')[1]);

    if (!Number.isFinite(num)) {
      await this.sendAvailableCourtPickerForTime(
        from,
        session,
        `No pude identificar esa cancha 😅\n` +
          `Elige una cancha disponible para *${session.time}*.`,
      );
      return;
    }

    const availableCourts = await this.getAvailableCourtsForTime(
      session.date,
      session.time,
    );
    const availableIds = availableCourts.map((court) => court.id);

    if (!availableIds.includes(num)) {
      session.availableCourtIds = availableIds;
      await this.setSession(from, session);
      await this.sendAvailableCourtPickerForTime(
        from,
        session,
        `Esa cancha ya no está disponible para *${session.time}*.\n` +
          `Elige una de las canchas que siguen libres:`,
      );
      return;
    }

    const court = availableCourts.find((item) => item.id === num);

    if (!court || !this.matchesConfiguredCourtType(court.type)) {
      await this.sendAvailableCourtPickerForTime(
        from,
        session,
        `No pude identificar esa cancha 😅\n` +
          `Elige una cancha disponible para *${session.time}*.`,
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
    await this.fillPricePreview(session);

    if (session.reservationName) {
      session.step = 'ask_name';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        `${court.name} seleccionada ✅\n` +
          `Precio: ${this.getSessionPriceText(session)}\n\n` +
          `Tengo este nombre guardado: *${session.reservationName}*.\n` +
          `Escribe **mismo** para usarlo o envía un nombre nuevo.\n\n` +
          `Escribe *atras* para volver.`,
      );
      return;
    }

    session.step = 'ask_name';
    await this.setSession(from, session);
    await this.messenger.sendText(
      from,
      `${court.name} seleccionada ✅\n` +
        `Precio: ${this.getSessionPriceText(session)}\n\n` +
        `¿A nombre de quién va la reserva? ✍️\n\n` +
        `Escribe *atras* para volver.`,
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

    const result = await this.availability.getAvailableCourtsForTime(
      this.config.courtType,
      session.date,
      session.time,
    );

    if (!result.courts.some((court) => court.id === Number(session.cancha))) {
      session.step = 'choose_time';
      delete session.cancha;
      delete session.availableCourtIds;
      await this.setSession(from, session);

      await this.messenger.sendText(
        from,
        `⚠️ Ese horario ya no está disponible para la cancha seleccionada.\n` +
          `Elige otra hora o vuelve a seleccionar una cancha.`,
      );
      await this.sendAvailabilityAcrossCourts(from, session, session.date);
      return;
    }

    if (!result.slot) {
      session.step = 'choose_time';
      await this.setSession(from, session);
      await this.messenger.sendText(
        from,
        'No pude calcular ese horario. Elige otra hora disponible.',
      );
      return;
    }

    try {
      const created = await this.createBooking.execute({
        contactId: session.contactId ?? null,
        courtId: Number(session.cancha),
        paymentId: null,
        paymentMethod: PaymentMethod.Pendiente,
        userId: null,
        startTime: result.slot.start.toISOString(),
        endTime: result.slot.end.toISOString(),
        status: BookingStatus.Confirmed,
        date: session.date,
        title: session.reservationName,
      });

      await this.messenger.sendText(
        from,
        `✅ *Reserva guardada*\n` +
          `• Deporte: ${this.sportLabel}\n` +
          `• Nombre: ${session.reservationName}\n` +
          `• Cancha: ${await this.getCourtLabel(session.cancha)}\n` +
          `• Fecha: ${ymdToDmy(session.date)}\n` +
          `• Hora: ${session.time}\n` +
          `• Precio: ${created.priceApplied} ${created.currencyApplied ?? ''}\n\n` +
          `Escribe **menu** para una nueva reserva o **salir** para terminar.`,
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
        delete session.cancha;
        delete session.availableCourtIds;
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
        delete session.cancha;
        delete session.availableCourtIds;
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
