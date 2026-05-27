import { Module } from '@nestjs/common';
import { WebhookController } from './interface/controllers/webhook.controller';
import { WebhookService } from './interface/services/webhook.service';

import { WhatsappMessengerAdapter } from './infrastructure/messaging/whatsapp.messenger.adapter';
import { MemorySessionStore } from './infrastructure/session/memory.session.store';
import { HandleIncomingMessageUseCase } from './application/use-cases/handle-incoming-message.use-case';
import { BookingsModule } from '../events/bookings.module';
import { CourtsModule } from '../courts/courts.module';

import { CancelBookingUseCase } from 'src/events/application/use-cases/cancel-booking.use-case';
import { CreateBookingUseCase } from 'src/events/application/use-cases/create-booking.use-case';

import { BookingRepository } from 'src/events/domain/repositories/booking.repository';
import { ContactsRepository } from 'src/events/domain/repositories/contacts.repository';
import { COURTS_READER, CourtsReaderPort } from 'src/courts/domain/ports/courts-reader.port';
import { CourtPricingRepository } from 'src/events/domain/repositories/court-pricing.repository';
import { CourtBlockRepository } from 'src/events/domain/repositories/court-block.repository';

@Module({
  imports: [BookingsModule, CourtsModule],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WhatsappMessengerAdapter,
    MemorySessionStore,
    {
      provide: HandleIncomingMessageUseCase,
      useFactory: (
        messenger: WhatsappMessengerAdapter,
        store: MemorySessionStore,
        bookingRepo: BookingRepository,
        contactsRepo: ContactsRepository,
        cancelBookingUseCase: CancelBookingUseCase,
        createBookingUseCase: CreateBookingUseCase,
        courtsReader: CourtsReaderPort,
        pricingRepo: CourtPricingRepository,
        courtBlocks: CourtBlockRepository,
      ) => {
        return new HandleIncomingMessageUseCase(
          messenger,
          store,
          bookingRepo,
          contactsRepo,
          cancelBookingUseCase,
          createBookingUseCase,
          courtsReader,
          pricingRepo,
          courtBlocks,
        );
      },
      inject: [
        WhatsappMessengerAdapter,
        MemorySessionStore,
        'BookingRepository',
        'ContactsRepository',
        CancelBookingUseCase,
        CreateBookingUseCase,
        COURTS_READER,
        'CourtPricingRepository',
        'CourtBlockRepository',
      ],
    },
  ],
})
export class WebhookModule {}
