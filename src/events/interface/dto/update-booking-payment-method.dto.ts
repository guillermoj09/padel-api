import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../../domain/entities/booking';

export class UpdateBookingPaymentMethodDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}