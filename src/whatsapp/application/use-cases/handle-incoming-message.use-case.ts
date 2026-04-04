import { Injectable, Inject } from '@nestjs/common';
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';
import { CancelBookingUseCase } from '../../../events/application/use-cases/cancel-booking.use-case';
import { CreateBookingUseCase } from '../../../events/application/use-cases/create-booking.use-case';
import { ReservationFlow } from '../flows/reservation.flow';
import { CancelFlow } from '../flows/cancel.flow';
import { normalizeE164 } from '../flows/helpers';
import { TZ } from '../services/time.utils';
import { Session } from '../../domain/types/session.types';
import {
  COURTS_READER,
  CourtsReaderPort,
} from '../../../courts/domain/ports/courts-reader.port';
import { CourtPricingRepository } from '../../../events/domain/repositories/court-pricing.repository';

@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly reservation: ReservationFlow;
  private readonly cancel: CancelFlow;

  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    @Inject('BookingRepository')
    private readonly bookings: BookingRepository,
    @Inject('ContactsRepository')
    private readonly contacts: ContactsRepository,
    private readonly cancelBooking: CancelBookingUseCase,
    @Inject('CreateBookingUseCase')
    private readonly createBooking: CreateBookingUseCase,
    @Inject(COURTS_READER)
    private readonly courtsReader: CourtsReaderPort,
    @Inject('CourtPricingRepository')
    private readonly pricingRepo: CourtPricingRepository,
  ) {
    this.reservation = new ReservationFlow(
      messenger,
      sessions,
      bookings,
      this.createBooking,
      this.courtsReader,
      this.pricingRepo,
    );

    this.cancel = new CancelFlow(
      messenger,
      sessions,
      bookings,
      contacts,
      cancelBooking,
    );
  }

  private async getSession(from: string): Promise<Session> {
    return (await this.sessions.get(from)) ?? { step: 'idle' };
  }

  private async setSession(from: string, session: Session): Promise<void> {
    await this.sessions.set(from, session);
  }

  private buildCleanSession(session: Session): Session {
    return {
      step: 'idle',
      contactId: session.contactId,
      contactPhone: session.contactPhone,
    } as Session;
  }

  private async ensureContact(
    from: string,
    session: Session,
  ): Promise<Session> {
    if (!session.contactId) {
      const contact = await this.contacts.findOrCreateByWaPhone(from, null, TZ);
      session.contactId = contact.id;
      session.contactPhone = contact.waPhone;
    }

    return session;
  }

  private async handleMenu(from: string, session: Session): Promise<void> {
    let cleanSession = this.buildCleanSession(session);
    cleanSession = await this.ensureContact(from, cleanSession);

    await this.setSession(from, cleanSession);

    await this.messenger.sendButtons(
      from,
      '¡Hola! 👋\nBienvenido Ecoclub by ProfeJoshua 🎾\n\nPuedo ayudarte con una reserva o con la cancelación de una reserva existente.\n\nElige una opción:',
      [
        { id: 'opt_reserve', title: 'Reservar cancha' },
        { id: 'opt_cancel', title: 'Cancelar reserva' },
      ],
    );
  }

  async execute(from: string, rawPayload: string): Promise<void> {
    const waFrom = normalizeE164(from);
    const payload = (rawPayload ?? '').trim();
    const p = payload.toLowerCase();
    const session = await this.getSession(waFrom);

    if (['cancel', 'cancelar', 'salir'].includes(p)) {
      await this.sessions.del(waFrom);
      await this.messenger.sendText(waFrom, 'Flujo cancelado. Escribe "menu".');
      return;
    }

    if (['atras', 'atrás', 'volver'].includes(p)) {
      if (
        [
          'choose_cancha',
          'choose_date',
          'awaiting_other_date',
          'choose_time',
          'ask_name',
          'confirm_booking',
        ].includes(session.step)
      ) {
        return this.reservation.goBack(waFrom, session);
      }

      await this.messenger.sendText(
        waFrom,
        'No hay un paso anterior al que volver.\nEscribe *menu* para comenzar de nuevo.',
      );
      return;
    }

    if (p === 'menu' || p === 'start' || p === 'inicio') {
      await this.handleMenu(waFrom, session);
      return;
    }

    if (p === 'reservar' || p === 'reserva' || payload === 'opt_reserve') {
      const cleanSession = await this.ensureContact(
        waFrom,
        this.buildCleanSession(session),
      );
      await this.setSession(waFrom, cleanSession);
      return this.reservation.start(waFrom, cleanSession);
    }

    if (payload === 'opt_cancel') {
      const cleanSession = await this.ensureContact(
        waFrom,
        this.buildCleanSession(session),
      );
      await this.setSession(waFrom, cleanSession);
      return this.cancel.list(waFrom, cleanSession);
    }

    if (session.step === 'choose_cancha' && payload.startsWith('cancha_')) {
      return this.reservation.chooseCancha(waFrom, session, payload);
    }

    if (session.step === 'choose_date') {
      return this.reservation.chooseDate(waFrom, session, payload);
    }

    if (session.step === 'awaiting_other_date') {
      return this.reservation.awaitingOtherDate(waFrom, session, payload);
    }

    if (session.step === 'choose_time') {
      return this.reservation.chooseTime(waFrom, session, payload);
    }

    if (session.step === 'ask_name') {
      return this.reservation.askNameAndPrepareConfirmation(
        waFrom,
        session,
        payload,
      );
    }

    if (session.step === 'confirm_booking') {
      if (payload === 'CONFIRM_BOOKING') {
        return this.reservation.confirmBooking(waFrom, session);
      }

      await this.messenger.sendText(
        waFrom,
        'Pulsa "Confirmar reserva" o escribe "cancelar".',
      );
      return;
    }

    if (
      session.step === 'cancel_choose' &&
      payload.startsWith('CANCEL_PAGE:')
    ) {
      const pageNum = Number(payload.split(':')[1] || '1');
      return this.cancel.paginate(waFrom, session, pageNum);
    }

    if (
      session.step === 'cancel_choose' &&
      /^[1-3]$/.test(p) &&
      session.cancelOptions?.length
    ) {
      const idx = Number(p) - 1;
      const id = session.cancelOptions[idx];

      if (!id) {
        await this.messenger.sendText(
          waFrom,
          'Esa opción no es válida. Elige una opción de la lista.',
        );
        return;
      }

      return this.cancel.askConfirm(waFrom, session, id);
    }

    if (session.step === 'cancel_choose' && payload.startsWith('CANCEL:')) {
      const id = payload.split(':')[1];

      if (!id) {
        await this.messenger.sendText(
          waFrom,
          'No pude identificar la reserva a cancelar.',
        );
        return;
      }

      return this.cancel.askConfirm(waFrom, session, id);
    }

    if (session.step === 'cancel_confirm') {
      if (payload.startsWith('CONFIRM_CANCEL:')) {
        return this.cancel.confirm(waFrom, session, payload);
      }

      await this.sessions.del(waFrom);
      await this.messenger.sendText(
        waFrom,
        'Operación cancelada. Escribe "menu".',
      );
      return;
    }

    if (session.step === 'idle') {
      await this.handleMenu(waFrom, session);
      return;
    }

    await this.messenger.sendText(
      waFrom,
      'No entendí tu mensaje 🤔\nSigue con una de las opciones del flujo o escribe *menu* para comenzar de nuevo.',
    );
  }
}
