// src/whatsapp/application/flows/cancel.flow.ts
import { MessengerPort } from '../../domain/ports/messenger.port';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { ContactsRepository } from '../../../events/domain/repositories/contacts.repository';
import { CancelBookingUseCase } from '../../../events/application/use-cases/cancel-booking.use-case';
import {
  groupByDate,
  normalizeE164,
  shortSlotTitle,
  ensureMax,
} from './helpers';

import { TZ } from '../services/time.utils';

export class CancelFlow {
  constructor(
    private readonly messenger: MessengerPort,
    private readonly sessions: SessionStorePort,
    private readonly bookings: BookingRepository,
    private readonly contacts: ContactsRepository,
    private readonly cancelBooking: CancelBookingUseCase,
  ) {}

  private async setSession(from: string, s: Session) {
    await this.sessions.set(from, s);
  }
  private async clearSession(from: string) {
    await this.sessions.del(from);
  }

  private async ensureContactId(
    from: string,
    session: Session,
  ): Promise<string> {
    if (session.contactId) return session.contactId;
    const waPhone = normalizeE164(from);
    const contact = await this.contacts.findOrCreateByWaPhone(
      waPhone,
      null,
      TZ,
    );
    session.contactId = contact.id;
    await this.setSession(from, session);
    return contact.id;
  }

  // 1) Listar próximas para cancelar (List Message si está disponible)
  async list(from: string, session: Session) {
    const contactId = await this.ensureContactId(from, session);
    const all = await this.bookings.findAll();
    const now = new Date();
    const upcoming = all
      .filter((b) => b.contactId === contactId && b.status !== 'cancelled')
      .filter((b) => new Date(b.startTime) > now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));

    if (!upcoming.length) {
      await this.messenger.sendText(
        from,
        'No encuentro reservas próximas para este número.',
      );
      return;
    }

    // Lista nativa (hasta 10), agrupada por día
    if (this.messenger.sendList) {
      const limited = upcoming.slice(0, 10);
      const groups = groupByDate(limited as any);
      const sections = Object.entries(groups).map(([date, rows]) => ({
        title: date,
        rows: rows.map((b: any) => ({
          id: `CANCEL:${b.id}`,
          // antes:
          // title: `${fmtSlot(b.startTime as any, b.endTime as any, b.courtId).split('• ')[1]}`,
          // después (más corto y seguro):
          title: ensureMax(
            shortSlotTitle(b.startTime as any, b.endTime as any, b.courtId),
            24,
          ),
          description: 'Toca para cancelar',
        })),
      }));

      await this.messenger.sendList(from, {
        header: 'Cancelar reserva',
        body: 'Elige una reserva próxima para cancelar:',
        footer: 'Puedes cancelar hasta 120 min antes del inicio.',
        sections,
      });

      session.step = 'cancel_choose';
      session.cancelOptions = limited.map((b) => b.id);
      await this.setSession(from, session);
      return;
    }

    // Fallback a botones (3) con posible paginación
    const page = upcoming.slice(0, 3);
    const buttons = page.map((b) => ({
      id: `CANCEL:${b.id}`,
      // antes: title: fmtSlot(...)
      title: ensureMax(
        shortSlotTitle(b.startTime as any, b.endTime as any, b.courtId),
        20,
      ),
    }));

    await this.messenger.sendButtons(
      from,
      'Elige la reserva a cancelar:',
      buttons,
    );
    if (upcoming.length > 3) {
      await this.messenger.sendButtons(from, 'Más opciones:', [
        { id: 'CANCEL_PAGE:2', title: 'Ver más' },
      ]);
    }
    await this.messenger.sendText(
      from,
      'Si no ves opciones, responde con 1, 2 o 3.',
    );
    session.step = 'cancel_choose';
    session.cancelOptions = page.map((b) => b.id);
    await this.setSession(from, session);
  }

  // 2) Paginación simple (botones)
  async paginate(from: string, session: Session, pageNum: number) {
    const contactId = await this.ensureContactId(from, session);
    const all = await this.bookings.findAll();
    const now = new Date();
    const upcoming = all
      .filter((b) => b.contactId === contactId && b.status !== 'cancelled')
      .filter((b) => new Date(b.startTime) > now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));

    const start = (pageNum - 1) * 3;
    const page = upcoming.slice(start, start + 3);
    if (!page.length) {
      await this.messenger.sendText(from, 'No hay más reservas para mostrar.');
      return;
    }
    const buttons = page.map((b) => ({
      id: `CANCEL:${b.id}`,
      title: ensureMax(
        shortSlotTitle(b.startTime as any, b.endTime as any, b.courtId),
        20,
      ),
    }));
    await this.messenger.sendButtons(
      from,
      `Página ${pageNum}: elige la reserva a cancelar:`,
      buttons,
    );
    if (upcoming.length > start + 3) {
      await this.messenger.sendButtons(from, 'Más opciones:', [
        { id: `CANCEL_PAGE:${pageNum + 1}`, title: 'Ver más' },
      ]);
    }
    session.cancelOptions = page.map((b) => b.id);
    await this.setSession(from, session);
  }

  // 3) Confirmar
  async askConfirm(from: string, session: Session, bookingId: string) {
    session.bookingIdToCancel = bookingId;
    session.step = 'cancel_confirm';
    await this.setSession(from, session);
    await this.messenger.sendButtons(
      from,
      '¿Confirmas que deseas cancelar esta reserva?',
      [
        { id: `CONFIRM_CANCEL:${bookingId}`, title: 'Sí, cancelar' },
        { id: 'CANCEL_BACK', title: 'No' },
      ],
    );
  }

  // 4) Ejecutar cancelación
  async confirm(from: string, session: Session, payload: string) {
    const bookingId = payload.split(':')[1]?.trim();
    if (!bookingId || bookingId !== session.bookingIdToCancel) {
      await this.messenger.sendText(
        from,
        'La reserva seleccionada ya no es válida. Intenta de nuevo.',
      );
      await this.clearSession(from);
      return;
    }

    try {
      await this.cancelBooking.execute(bookingId, {
        reason: 'Cancelación solicitada por WhatsApp',
        by: `wa:${normalizeE164(from)}`,
      } as any);

      await this.messenger.sendText(
        from,
        '✅ Reserva cancelada. Si quieres reservar otra vez, escribe "menu".',
      );
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('too late')) {
        await this.messenger.sendText(
          from,
          '⏳ Falta muy poco para el inicio. Ya no es posible cancelar por este medio.',
        );
      } else if (msg.includes('not allowed')) {
        await this.messenger.sendText(
          from,
          '❌ No tienes permiso para cancelar esa reserva.',
        );
      } else if (msg.includes('not found')) {
        await this.messenger.sendText(from, 'No encontré esa reserva.');
      } else {
        await this.messenger.sendText(
          from,
          '❌ Error al cancelar. Intenta más tarde.',
        );
      }
    } finally {
      await this.clearSession(from);
    }
  }
}
