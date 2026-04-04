import { IsEnum, NotEquals } from 'class-validator';
import { PaymentMethod } from '../../domain/entities/booking';

export class ConfirmBookingPaymentDto {
  @IsEnum(PaymentMethod)
  @NotEquals(PaymentMethod.Pendiente, {
    message: 'paymentMethod no puede ser pendiente al confirmar el pago',
  })
  paymentMethod!: PaymentMethod;
}
