import { Injectable, Inject } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';

@Injectable()
export class GetBookingsByCourtUseCase {
  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}
  async execute(courtId: string, start: Date, end: Date) {
    return this.bookingRepository.findByCourtAndDateRange(courtId, start, end);
  }
}
