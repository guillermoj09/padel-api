// src/whatsapp/application/use-cases/handle-incoming-message.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';
import { CancelBookingUseCase } from '../../../events/application/use-cases/cancel-booking.use-case';
import { ReservationFlow } from '../flows/reservation.flow';
import { CancelFlow } from '../flows/cancel.flow';
import { normalizeE164 } from '../flows/helpers';
import { TZ } from '../services/time.utils';

@Injectable()
export class HandleIncomingMessageUseCase {
  private reservation: ReservationFlow;
  private cancel: CancelFlow;

  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    @Inject('BookingRepository') private readonly bookings: BookingRepository,
    @Inject('ContactsRepository') private readonly contacts: ContactsRepository,
    private readonly cancelBooking: CancelBookingUseCase,
  ) {
    this.reservation = new ReservationFlow(messenger, sessions, bookings);
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
  private async clearSession(from: string) {
    await this.sessions.del(from);
  }

  // Menú
  private async handleMenu(from: string, session: Session) {
    // asegura contactId
    if (!session.contactId) {
      const waPhone = normalizeE164(from);
      const contact = await this.contacts.findOrCreateByWaPhone(
        waPhone,
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
    const payload = rawPayload.trim();
    const p = payload.toLowerCase();
    const session = await this.getSession(from);

    // Global escapes
    if (['cancel', 'cancelar', 'salir'].includes(p)) {
      await this.clearSession(from);
      await this.messenger.sendText(
        from,
        'Flujo cancelado. Escribe "menu" para comenzar.',
      );
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
      await this.handleMenu(from, session);
      return;
    }

    // === Reserva ===
    if (payload === 'opt_reserve') return this.reservation.start(from, session);
    if (session.step === 'choose_cancha' && payload.startsWith('cancha_'))
      return this.reservation.chooseCancha(from, session, payload);
    if (session.step === 'choose_date')
      return this.reservation.chooseDate(from, session, payload);
    if (session.step === 'awaiting_other_date')
      return this.reservation.awaitingOtherDate(from, session, payload);
    if (session.step === 'choose_time')
      return this.reservation.chooseTime(from, session, payload);

    // === Cancelación ===
    if (payload === 'opt_cancel') return this.cancel.list(from, session);
    if (
      session.step === 'cancel_choose' &&
      payload.startsWith('CANCEL_PAGE:')
    ) {
      const pageNum = Number(payload.split(':')[1] || '2');
      return this.cancel.paginate(from, session, pageNum);
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
          from,
          'Opción inválida. Intenta de nuevo.',
        );
        return;
      }
      return this.cancel.askConfirm(from, session, id);
    }
    if (session.step === 'cancel_choose' && payload.startsWith('CANCEL:')) {
      const id = payload.split(':')[1]?.trim();
      if (!id) {
        await this.messenger.sendText(
          from,
          'No entendí cuál reserva cancelar.',
        );
        return;
      }
      return this.cancel.askConfirm(from, session, id);
    }
    if (session.step === 'cancel_confirm') {
      if (payload.startsWith('CONFIRM_CANCEL:'))
        return this.cancel.confirm(from, session, payload);
      if (payload === 'CANCEL_BACK' || ['no', 'volver'].includes(p)) {
        await this.messenger.sendText(
          from,
          'Operación cancelada. Escribe "menu" para comenzar.',
        );
        await this.clearSession(from);
        return;
      }
    }

    // Fallback
    await this.messenger.sendText(
      from,
      'No entendí. Escribe "menu" para reservar o cancelar.\nFlujo: cancha → fecha → hora. Para cancelar: “Cancelar reserva”.',
    );
  }
}
