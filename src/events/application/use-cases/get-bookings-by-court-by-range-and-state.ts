import { Injectable, Inject } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { BookingStatus } from 'src/events/domain/entities/booking';

@Injectable()
export class GetCourtReservationsByDateRangeAndStatus {
  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(courtId: string,status: BookingStatus | undefined, from: Date, to: Date) {
    console.log("status "+ status);
    return this.bookingRepository.findByCourtAndDateRangeAndStatus(
      courtId,
      from,
      to,
      status,
    );
  }
}
