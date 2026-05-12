import { Injectable } from '@nestjs/common';
import { BookingStatus } from 'src/events/domain/entities/booking';
import { GetBookingsByCourtUseCase } from './get-bookings-by-court.use-case';
import { GetCourtBlocksByCourtAndRangeUseCase } from './get-court-blocks-by-court-and-range.use-case';

@Injectable()
export class GetCourtCalendarUseCase {
  constructor(
    private readonly getBookingsByCourtUseCase: GetBookingsByCourtUseCase,
    private readonly getCourtBlocksByCourtAndRangeUseCase: GetCourtBlocksByCourtAndRangeUseCase,
  ) {}

  async execute(courtId: string, from: Date, to: Date) {
    const [bookings, blocks] = await Promise.all([
      this.getBookingsByCourtUseCase.execute(courtId, from, to),
      this.getCourtBlocksByCourtAndRangeUseCase.execute(courtId, from, to),
    ]);
    const bookingEvents = bookings.map((booking) => ({
      id: `${booking.id}`,
      rawId: booking.id,
      title: booking.title ?? 'Reserva',
      start: booking.startTime,
      end: booking.endTime,
      estado:
        booking.status === BookingStatus.Cancelled ? 'cancelada' : 'reservada',
      canchaId: booking.courtId,
      resourceId: String(booking.courtId),
      type: 'booking',
      raw: booking,
    }));

    const blockEvents = blocks.map((block) => ({
      id: `block-${block.id}`,
      rawId: block.id,
      title: block.title ?? 'Cancha bloqueada',
      start: block.startTime,
      end: block.endTime,
      estado: 'bloqueada',
      canchaId: block.courtId,
      resourceId: String(block.courtId),
      type: 'court_block',
      raw: block,
    }));

    return [...bookingEvents, ...blockEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }
}
