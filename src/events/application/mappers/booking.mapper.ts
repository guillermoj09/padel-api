// src/events/application/mappers/booking.mapper.ts
import {
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/booking';
import { CreateBookingDto } from '../../interface/dto/create-booking.dto';

export class BookingMapper {
  static toCreatable(dto: CreateBookingDto): Omit<Booking, 'id'> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    const status: BookingStatus = dto.status ?? BookingStatus.Pending;

    return {
      title: dto.title ?? null,
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.Pendiente,
      paymentStatus: PaymentStatus.Pending,
      paidAt: null,
      paymentConfirmedBy: null,
      startTime: start,
      endTime: end,
      date: dto.date,
      status,
      contactId: dto.contactId ?? undefined,
    };
  }

  static toResponse(b: Booking) {
    return {
      id: b.id,
      title: b.title,
      userId: b.userId,
      courtId: b.courtId,
      paymentId: b.paymentId,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      paidAt: b.paidAt,
      paymentConfirmedBy: b.paymentConfirmedBy,
      contactId: b.contactId,
      startTime:
        'start_time' in b ? (b as any).start_time : (b as any).startTime,
      endTime: 'end_time' in b ? (b as any).end_time : (b as any).endTime,
      date: b.date,
      status: b.status,
    };
  }
}
