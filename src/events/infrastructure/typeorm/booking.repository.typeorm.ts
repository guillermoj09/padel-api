import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, Not, LessThan, MoreThan } from 'typeorm';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import type { Booking } from '../../domain/entities/booking';
import { BookingStatus } from '../../domain/entities/booking';
import { BookingSchema } from './entities/booking.schema';
import { BookingMapper } from './mappers/booking.mapper';

type CreateBookingInput = Omit<Booking, 'id'>; // tu modelo actual: userId puede ser null, date es Date

@Injectable()
export class TypeOrmBookingRepository implements BookingRepository {
  constructor(
    @InjectRepository(BookingSchema)
    private readonly repo: Repository<BookingSchema>,
    private readonly bookingMapper: BookingMapper,
  ) {}
  async findWaPhoneByBookingId(id: string | number): Promise<string | null> {
    const row = await this.repo
      .createQueryBuilder('b')
      .leftJoin('b.contact', 'c')
      .select(['b.id', 'c.waPhone'])
      .where('b.id = :id', { id: String(id) })
      .getOne();

    const phone = (row as any)?.contact?.waPhone ?? null;
    return phone ? String(phone) : null;
  }

  async findById(id: string | number): Promise<Booking | null> {
    const e = await this.repo.findOne({
      where: { id: String(id) },
      relations: { court: true, user: true, contact: true, payment: true },
    });
    return e ? this.bookingMapper.toDomain(e) : null;
  }

  // ejemplo dentro de tu repo TypeORM
  async cancel(
    id: string | number,
    info: { reason?: string | null; by?: string | number | null },
  ): Promise<Booking> {
    return await this.repo.manager.transaction(async (em) => {
      const r = em.getRepository(BookingSchema);

      const b = await r.findOne({ where: { id: String(id) } });
      if (!b) {
        // La interfaz exige Promise<Booking>, no puede ser null → lanza error
        throw new Error('Booking not found in cancel');
      }

      (b as any).status = 'cancelled';
      (b as any).canceledAt = new Date();
      (b as any).cancelReason = info.reason ?? null;
      (b as any).canceledBy = info.by != null ? String(info.by) : null;

      await r.save(b);

      const reloaded = await em.getRepository(BookingSchema).findOne({
        where: { id: String(id) },
        relations: { court: true, user: true, contact: true, payment: true },
      });
      if (!reloaded) {
        throw new Error('Booking disappeared after cancel');
      }

      // 👇 Devuelve dominio, no schema
      return this.bookingMapper.toDomain(reloaded);
    });
  }

  async existsByCourtAndStart(
    courtId: number | string,
    start: Date,
  ): Promise<boolean> {
    const found = await this.repo.findOne({
      where: {
        court: { id: Number(courtId) },
        start_time: start,
      },
      select: { id: true }, // más eficiente
    });
    return !!found;
  }

  async findAll(): Promise<Booking[]> {
    const bookingSchemas = await this.repo.find({
      relations: ['user', 'court', 'payment'],
    });
    return bookingSchemas.map((b) => this.toDomain(b));
  }

  async findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<Booking[]> {
    const rows = await this.repo.find({
      where: {
        court: { id: Number(courtId) },
        // solapamiento básico: empieza antes de que termine el rango y termina después de que empiece
        start_time: LessThan(end),
        end_time: MoreThan(start),
        status: Not(BookingStatus.Cancelled),
      },
      relations: { user: true, court: true, payment: true },
    });

    // ✅ nada de `new Booking(...)`, usa el mapper o un objeto literal
    return rows.map((b) => this.toDomain(b));
  }

  async findByCourtAndDateRangeAndStatus(
    courtId: string,
    start: Date,
    end: Date,
    status?: BookingStatus, // 👈 nuevo parámetro (opcional)
  ): Promise<Booking[]> {
    const where: any = {
      court: { id: Number(courtId) },
      // solapamiento básico: empieza antes de que termine el rango y termina después de que empiece
      start_time: LessThan(end),
      end_time: MoreThan(start),
    };
    console.log("repository");
    if (status) {
      // si me lo pasan, filtro exactamente por ese status
      where.status = status;
    } else {
      // si no me pasan nada, mantengo la lógica anterior
      where.status = Not(BookingStatus.Cancelled);
    }

    const rows = await this.repo.find({
      where,
      relations: { user: true, court: true, payment: true },
    });
    console.log("rows" +rows);
    return rows.map((b) => this.toDomain(b));
  }

  async create(booking: CreateBookingInput): Promise<Booking> {
    console.log(`entro ${booking.title}`);

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
      title: booking.title,
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
    return {
      id: schema.id,
      userId: schema.userId ?? schema.user?.id ?? null, // si aquí tu tipo NO acepta null, cámbialo a undefined también
      courtId: Number(schema.courtId ?? schema.court?.id),
      paymentId: schema.paymentId ?? schema.payment?.id ?? null, // idem observación
      startTime: schema.start_time,
      endTime: schema.end_time,
      status: schema.status,
      date: schema.date,
      title: schema.title ?? null,
      contactId: schema.contactId ?? schema.contact?.id ?? undefined, // 👈 antes era null
      createdAt: (schema as any).createdAt ?? undefined,
      updatedAt: (schema as any).updatedAt ?? undefined,
      canceledAt: (schema as any).canceledAt ?? undefined,
      cancelReason: (schema as any).cancelReason ?? undefined,
      canceledBy: (schema as any).canceledBy ?? undefined,
    };
  }
}
