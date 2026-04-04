import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingSchema } from './infrastructure/typeorm/entities/booking.schema';
import { TypeOrmBookingRepository } from './infrastructure/typeorm/booking.repository.typeorm';
import { CreateBookingUseCase } from './application/use-cases/create-booking.use-case';
import { GetBookingsUseCase } from './application/use-cases/get-booking.use-case';
import { BookingController } from './interface/controllers/events.controller';
import { BookingMapper } from './infrastructure/typeorm/mappers/booking.mapper';
import { GetBookingsByCourtUseCase } from './application/use-cases/get-bookings-by-court.use-case';
import { ContactsRepositoryTypeorm } from './infrastructure/typeorm/contacts.repository.typeorm';
import { ContactSchema } from './infrastructure/typeorm/entities/contact.schema';
import { CancelBookingUseCase } from './application/use-cases/cancel-booking.use-case';
import { GetCourtReservationsByDateRangeAndStatus } from './application/use-cases/get-bookings-by-court-by-range-and-state';
import { CourtPricingRepositoryTypeorm } from './infrastructure/typeorm/court-pricing.repository.typeorm';
import { CourtSchema } from 'src/courts/infrastructure/typeorm/entities/court.schema';
import { CourtDailyRateSchema } from 'src/courts/infrastructure/typeorm/entities/court-daily-rate.schema';
import { ConfirmBookingPaymentUseCase } from './application/use-cases/confirm-booking-payment.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingSchema,
      ContactSchema,
      CourtSchema,
      CourtDailyRateSchema,
    ]),
  ],
  controllers: [BookingController],
  providers: [
    BookingMapper,
    CancelBookingUseCase,
    ConfirmBookingPaymentUseCase,
    CreateBookingUseCase,
    GetBookingsUseCase,
    GetBookingsByCourtUseCase,
    GetCourtReservationsByDateRangeAndStatus,
    TypeOrmBookingRepository,
    {
      provide: 'BookingRepository',
      useClass: TypeOrmBookingRepository,
    },
    ContactsRepositoryTypeorm,
    { provide: 'ContactsRepository', useExisting: ContactsRepositoryTypeorm },
    CourtPricingRepositoryTypeorm,
    {
      provide: 'CourtPricingRepository',
      useClass: CourtPricingRepositoryTypeorm,
    },
  ],
  exports: [
    CancelBookingUseCase,
    ConfirmBookingPaymentUseCase,
    CreateBookingUseCase,
    'BookingRepository',
    'ContactsRepository',
    'CourtPricingRepository',
  ],
})
export class BookingsModule {}
