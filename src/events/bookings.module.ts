import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingSchema } from './infrastructure/typeorm/entities/booking.schema';
import { TypeOrmBookingRepository } from './infrastructure/typeorm/booking.repository.typeorm';
import { CreateBookingUseCase } from './application/use-cases/create-booking.use-case';
import { GetBookingsUseCase } from './application/use-cases/get-booking.use-case';
import { BookingController } from './interface/controllers/booking.controller';
import { BookingMapper } from './infrastructure/typeorm/mappers/booking.mapper';
import { GetBookingsByCourtUseCase } from './application/use-cases/get-bookings-by-court.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([BookingSchema])],
  controllers: [BookingController],
  providers: [
    BookingMapper,
    CreateBookingUseCase,
    GetBookingsUseCase,
    GetBookingsByCourtUseCase, // ✅ <- esto faltaba
    TypeOrmBookingRepository,
    {
      provide: 'BookingRepository',
      useClass: TypeOrmBookingRepository,
    },
  ],
})
export class EventsModule {}
