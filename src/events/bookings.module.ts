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
import { CourtBlockSchema } from './infrastructure/typeorm/entities/court-block.schema';
import { TypeOrmCourtBlockRepository } from './infrastructure/typeorm/court-block.repository.typeorm';
import { CreateCourtBlockUseCase } from './application/use-cases/create-court-block.use-case';
import { CancelCourtBlockUseCase } from './application/use-cases/cancel-court-block.use-case';
import { GetCourtBlocksByCourtAndRangeUseCase } from './application/use-cases/get-court-blocks-by-court-and-range.use-case';
import { CourtBlocksController } from './interface/controllers/court-blocks.controller';
import { GetCourtCalendarUseCase } from './application/use-cases/get-court-calendar.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingSchema,
      ContactSchema,
      CourtSchema,
      CourtDailyRateSchema,
      CourtBlockSchema,
    ]),
  ],
  controllers: [BookingController, CourtBlocksController],
  providers: [
    BookingMapper,
    CancelBookingUseCase,
    ConfirmBookingPaymentUseCase,
    CreateBookingUseCase,
    GetBookingsUseCase,
    GetBookingsByCourtUseCase,
    GetCourtReservationsByDateRangeAndStatus,
    CreateCourtBlockUseCase,
    CancelCourtBlockUseCase,
    GetCourtBlocksByCourtAndRangeUseCase,
    GetCourtCalendarUseCase,
    TypeOrmBookingRepository,
    {
      provide: 'BookingRepository',
      useClass: TypeOrmBookingRepository,
    },
    TypeOrmCourtBlockRepository,
    {
      provide: 'CourtBlockRepository',
      useClass: TypeOrmCourtBlockRepository,
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
    CreateCourtBlockUseCase,
    CancelCourtBlockUseCase,
    'BookingRepository',
    'CourtBlockRepository',
    'ContactsRepository',
    'CourtPricingRepository',
  ],
})
export class BookingsModule {}
