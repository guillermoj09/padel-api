import { Inject, Injectable } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { Booking } from 'src/events/domain/entities/booking';

interface CreateBookingInput {
  userId: string;
  courtId: number;
  paymentId: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  date: string;
}

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') // 👈 usa el token
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<Booking> {
    return this.bookingRepository.create(input);
  }
}
