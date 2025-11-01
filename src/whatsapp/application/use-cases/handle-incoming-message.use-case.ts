// src/whatsapp/application/use-cases/handle-incoming-message.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';
import { CancelBookingUseCase } from '../../../events/application/use-cases/cancel-booking.use-case';
import { ReservationFlow } from '../flows/reservation.flow';
import { CancelFlow } from '../flows/cancel.flow';
import { normalizeE164 } from '../flows/helpers';
import { TZ } from '../services/time.utils';
import { Session } from '../../domain/types/session.types';

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
  ) {
    this.reservation = new ReservationFlow(
      messenger,
      sessions,
      bookings,
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

  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }

  private async handleMenu(from: string, session: Session) {
    // solo crea contacto si quieres guardarlo, pero NO tomamos su nombre
    if (!session.contactId) {
      const contact = await this.contacts.findOrCreateByWaPhone(
        from,
        null,
        TZ,
      );
      session.contactId = contact.id;
      session.contactPhone = contact.waPhone;
      await this.setSession(from, session);
    }
    await this.messenger.sendButtons(from, '¿Qué necesitas?', [
      { id: 'opt_reserve', title: 'Reservar cancha' },
      { id: 'opt_cancel', title: 'Cancelar reserva' },
    ]);
  }

  async execute(from: string, rawPayload: string): Promise<void> {
    const waFrom = normalizeE164(from);
    const payload = rawPayload.trim();
    const p = payload.toLowerCase();
    const session = await this.getSession(waFrom);

    // comandos globales
    if (['cancel', 'cancelar', 'salir'].includes(p)) {
      await this.sessions.del(waFrom);
      await this.messenger.sendText(waFrom, 'Flujo cancelado. Escribe "menu".');
      return;
    }

    // menú / inicio
    if (
      p.includes('menu') ||
      p === 'start' ||
      p === 'reservar' ||
      p === 'reserva' ||
      p === 'inicio'
    ) {
      await this.handleMenu(waFrom, session);
      return;
    }

    // ================== RESERVA ==================
    if (payload === 'opt_reserve') {
      return this.reservation.start(waFrom, session);
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
      return this.reservation.askNameAndCreate(waFrom, session, payload);
    }

    // ================== CANCELACIÓN ==================
    if (payload === 'opt_cancel') {
      return this.cancel.list(waFrom, session);
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
      return this.cancel.askConfirm(waFrom, session, id);
    }

    if (session.step === 'cancel_choose' && payload.startsWith('CANCEL:')) {
      const id = payload.split(':')[1];
      return this.cancel.askConfirm(waFrom, session, id);
    }

    if (session.step === 'cancel_confirm') {
      if (payload.startsWith('CONFIRM_CANCEL:')) {
        return this.cancel.confirm(waFrom, session, payload);
      }
      await this.sessions.del(waFrom);
      await this.messenger.sendText(waFrom, 'Operación cancelada. Escribe "menu".');
      return;
    }

    // fallback
    await this.messenger.sendText(
      waFrom,
      'No entendí 🤔. Escribe "menu" para reservar o cancelar.',
    );
  }
}
