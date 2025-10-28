// src/whatsapp/webhook.module.ts
import { Module } from '@nestjs/common';
import { WebhookController } from './interface/controllers/webhook.controller';
import { WebhookService } from './interface/services/webhook.service';

import { WhatsappMessengerAdapter } from './infrastructure/messaging/whatsapp.messenger.adapter';
import { MemorySessionStore } from './infrastructure/session/memory.session.store';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';

// 👇 Usa el nombre real de TU módulo de eventos
import { EventsModule } from '../events/bookings.module';
import { ContactsRepository } from 'src/events/domain/repositories/contacts.repository';
import { BookingRepository } from 'src/events/domain/repositories/booking.repository';
import { CancelBookingUseCase } from 'src/events/application/use-cases/cancel-booking.use-case';

// import { BookingsModule as EventsModule } from '../events/bookings.module';

@Module({
  imports: [EventsModule], // <- requisito para acceder al export 'BookingRepository'
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WhatsappMessengerAdapter,
    MemorySessionStore,
    CancelBookingUseCase,
    {
      provide: HandleIncomingMessageUseCase,
      useFactory: (
        messenger: WhatsappMessengerAdapter,
        store: MemorySessionStore,
        bookingRepo: BookingRepository,
        contactsRepo: ContactsRepository,
        cancelBookingUseCase: CancelBookingUseCase, // ← 4to parámetro
      ) =>
        new HandleIncomingMessageUseCase(
          messenger,
          store,
          bookingRepo,
          contactsRepo,
          cancelBookingUseCase,
        ),
      inject: [
        WhatsappMessengerAdapter,
        MemorySessionStore,
        'BookingRepository',
        'ContactsRepository',
        CancelBookingUseCase,
      ], // <- token
    },
  ],
})
export class WebhookModule {}
