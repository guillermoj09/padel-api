import { Injectable, Inject } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { Booking } from 'src/events/domain/entities/booking';

@Injectable()
export class GetBookingsUseCase {
  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(): Promise<Booking[]> {
    return this.bookingRepository.findAll();
  }
}
