import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { Booking } from '../../domain/entities/booking';
import { BookingSchema } from './entities/booking.schema';
import { BookingMapper } from './mappers/booking.mapper';
import { Between } from 'typeorm';

@Injectable()
export class TypeOrmBookingRepository implements BookingRepository {
  constructor(
    @InjectRepository(BookingSchema)
    private readonly repo: Repository<BookingSchema>,
    private readonly bookingMapper: BookingMapper,
  ) {}

  async findAll(): Promise<Booking[]> {
    const bookingSchemas = await this.repo.find({
      relations: ['user', 'court', 'payment'],
    });
    return bookingSchemas.map((b) => this.toDomain(b));
  }

  async findByCourtAndDateRange(
    courtId: string,
    start_time: Date,
    end_time: Date,
  ): Promise<Booking[]> {
    const rawBookings = await this.repo.find({
      where: {
        court: { id: Number(courtId) },
        start_time: Between(start_time, end_time), // ✅ CORRECTO
      },
      relations: ['user', 'court', 'payment'],
    });

    const bookings: Booking[] = rawBookings.map(
      (b) =>
        new Booking(
          b.id,
          b.userId,
          b.courtId,
          b.paymentId,
          b.start_time,
          b.end_time,
          b.status,
          b.date,
        ),
    );
    console.log(bookings);
    return bookings;
  }

  async create(booking: Omit<Booking, 'id'>): Promise<Booking> {
    console.log(`${booking.userId}`);

    const newBooking = this.repo.create({
      user: { id: booking.userId },
      court: { id: booking.courtId },
      payment: booking.paymentId ? { id: booking.paymentId } : undefined,
      start_time: booking.startTime,
      end_time: booking.endTime,
      status: booking.status,
      date: booking.date,
    });

    const saved = await this.repo.save(newBooking);

    const fullBooking = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['user', 'court', 'payment'],
    });

    if (!fullBooking) {
      throw new Error('Error al recargar la reserva después de guardarla.');
    }

    return this.toDomain(fullBooking);
  }

  private toDomain(schema: BookingSchema): Booking {
    return {
      id: schema.id,
      userId: schema.userId ?? schema.user?.id,
      courtId: schema.courtId ?? schema.court?.id,
      paymentId: schema.paymentId ?? schema.payment?.id ?? null,
      startTime: schema.start_time,
      endTime: schema.end_time,
      status: schema.status,
      date: schema.date,
    };
  }
}
