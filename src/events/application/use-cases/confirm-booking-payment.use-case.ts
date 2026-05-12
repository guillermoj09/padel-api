import { Inject, Injectable } from '@nestjs/common';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { Booking, PaymentMethod } from 'src/events/domain/entities/booking';

@Injectable()
export class ConfirmBookingPaymentUseCase {
  constructor(
    @Inject('BookingRepository')
    private readonly repo: BookingRepository,
  ) {}

  async execute(
    id: string,
    input: { paymentMethod: PaymentMethod; confirmedBy: string },
  ): Promise<Booking> {
    console.log(`Confirming payment for booking ${id} with method ${input.paymentMethod} by ${input.confirmedBy}`);
    return this.repo.confirmPayment(id, input);
  }
}
