import { Injectable, Inject } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { BookingFilterStatus } from 'src/events/domain/entities/booking';

@Injectable()
export class GetCourtReservationsByDateRangeAndStatus {
  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(
    courtId: string,
    filter: BookingFilterStatus | undefined,
    from: Date,
    to: Date,
  ) {
    return this.bookingRepository.findByCourtAndDateRangeAndFilter(
      courtId,
      from,
      to,
      filter,
    );
  }
}
