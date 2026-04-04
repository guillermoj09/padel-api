import { Inject, Injectable } from '@nestjs/common';
import { BookingRepository } from '../..//domain/repositories/booking.repository';
import { Booking, PaymentMethod } from 'src/events/domain/entities/booking';

@Injectable()
export class UpdateBookingPaymentMethodUseCase {
  constructor(
    @Inject('BookingRepository')
    private readonly repo: BookingRepository,
  ) {}

  async execute(id: string, paymentMethod: PaymentMethod): Promise<Booking> {
    return this.repo.updatePaymentMethod(id, paymentMethod);
  }
}