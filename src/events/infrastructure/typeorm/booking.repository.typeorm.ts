import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { Booking } from '../../domain/entities/booking';
import { BookingSchema } from './entities/booking.schema';
import { BookingMapper } from './mappers/booking.mapper';
import { Between } from 'typeorm';

type CreateBookingInput = Omit<Booking, 'id'>; // tu modelo actual: userId puede ser null, date es Date

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

  async create(booking: CreateBookingInput): Promise<Booking> {
    console.log(`entro ${booking.userId}`);

    const payload: DeepPartial<BookingSchema> = {
      // relaciones: asigna solo si hay id, si no pon null
      user: booking.userId ? ({ id: booking.userId as string } as any) : null,
      contact: booking.contactId
        ? ({ id: booking.contactId as string } as any)
        : null,
      court: { id: booking.courtId } as any,
      payment: booking.paymentId
        ? ({ id: booking.paymentId as string } as any)
        : null,

      // columnas (ojo con los nombres en snake_case)
      start_time: booking.startTime, // Date (timestamptz)
      end_time: booking.endTime, // Date (timestamptz)
      status: booking.status,
      date: booking.date, // Date (tu schema lo tipa como Date)
    };

    const entity = this.repo.create(payload as DeepPartial<BookingSchema>);
    const saved = await this.repo.save(entity); // ← ahora es BookingSchema, no array

    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['user', 'contact', 'court', 'payment'],
    });
    if (!full)
      throw new Error('Error al recargar la reserva después de guardarla.');

    return this.toDomain(full);
  }

  private toDomain(schema: BookingSchema): Booking {
    return new Booking(
      schema.id,
      schema.userId ?? schema.user?.id ?? null, // ← null safe
      (schema.courtId ?? schema.court?.id) as number, // asegura número
      schema.paymentId ?? schema.payment?.id ?? null,
      schema.start_time,
      schema.end_time,
      schema.status,
      schema.date, // si cambias a string, usa: typeof schema.date==='string'?schema.date:schema.date.toISOString().slice(0,10)
      schema.contactId ?? schema.contact?.id, // opcional
    );
  }
}
