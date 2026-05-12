import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, Not, LessThan, MoreThan } from 'typeorm';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import type { Booking } from '../../domain/entities/booking';
import {
  BookingFilterStatus,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/booking';
import { BookingSchema } from './entities/booking.schema';
import { BookingMapper } from './mappers/booking.mapper';

type CreateBookingInput = Omit<Booking, 'id'>;

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

  async updatePaymentMethod(
    id: string,
    paymentMethod: PaymentMethod,
  ): Promise<Booking> {
    const booking = await this.repo.findOne({
      where: { id: String(id) },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.paymentMethod = paymentMethod;
    await this.repo.save(booking);

    const reloaded = await this.repo.findOne({
      where: { id: String(id) },
      relations: { user: true, court: true, payment: true, contact: true },
    });

    if (!reloaded) {
      throw new NotFoundException('Booking not found after update');
    }

    return this.bookingMapper.toDomain(reloaded);
  }

  async confirmPayment(
    id: string,
    input: {
      paymentMethod: PaymentMethod;
      confirmedBy: string;
    },
  ): Promise<Booking> {
    const booking = await this.repo.findOne({
      where: { id: String(id) },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.paymentMethod = input.paymentMethod;
    booking.paymentStatus = PaymentStatus.Paid;
    booking.paidAt = new Date();
    booking.paymentConfirmedBy = input.confirmedBy;

    await this.repo.save(booking);

    const reloaded = await this.repo.findOne({
      where: { id: String(id) },
      relations: { user: true, court: true, payment: true, contact: true },
    });

    if (!reloaded) {
      throw new NotFoundException('Booking not found after payment confirmation');
    }

    return this.bookingMapper.toDomain(reloaded);
  }

  async cancel(
    id: string | number,
    info: { reason?: string | null; by?: string | number | null },
  ): Promise<Booking> {
    return await this.repo.manager.transaction(async (em) => {
      const r = em.getRepository(BookingSchema);

      const b = await r.findOne({ where: { id: String(id) } });
      if (!b) {
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
      select: { id: true },
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
        start_time: LessThan(end),
        end_time: MoreThan(start),
        status: Not(BookingStatus.Cancelled),
      },
      relations: { user: true, court: true, payment: true, contact: true },
    });
    return rows.map((b) => this.toDomain(b));
  }

  async findByCourtAndDateRangeAndFilter(
    courtId: string,
    start: Date,
    end: Date,
    filter?: BookingFilterStatus,
  ): Promise<Booking[]> {
    const qb = this.repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.court', 'court')
      .leftJoinAndSelect('booking.payment', 'payment')
      .leftJoinAndSelect('booking.contact', 'contact')
      .where('court.id = :courtId', { courtId: Number(courtId) })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start });

    if (filter === BookingFilterStatus.Pending) {
      qb.andWhere('booking.status = :pendingStatus', {
        pendingStatus: BookingStatus.Pending,
      });
    }

    if (filter === BookingFilterStatus.Confirmed) {
      qb
        .andWhere('booking.status = :confirmedStatus', {
          confirmedStatus: BookingStatus.Confirmed,
        })
        .andWhere('booking.paymentStatus != :paidStatus', {
          paidStatus: PaymentStatus.Paid,
        });
    }

    if (filter === BookingFilterStatus.Cancelled) {
      qb.andWhere('booking.status = :cancelledStatus', {
        cancelledStatus: BookingStatus.Cancelled,
      });
    }

    if (filter === BookingFilterStatus.Paid) {
      qb
        .andWhere('booking.paymentStatus = :paidStatus', {
          paidStatus: PaymentStatus.Paid,
        })
        .andWhere('booking.status != :cancelledStatus', {
          cancelledStatus: BookingStatus.Cancelled,
        });
    }

    const rows = await qb.getMany();
    return rows.map((b) => this.toDomain(b));
  }

  async existsActiveOverlap(
    courtId: number,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        court: { id: courtId },
        start_time: LessThan(end),
        end_time: MoreThan(start),
        status: Not(BookingStatus.Cancelled),
      },
    });

    return count > 0;
  }

  async create(booking: CreateBookingInput): Promise<Booking> {
    const payload: DeepPartial<BookingSchema> = {
      paymentMethod: booking.paymentMethod ?? PaymentMethod.Pendiente,
      paymentStatus: booking.paymentStatus ?? PaymentStatus.Pending,
      paidAt: booking.paidAt ?? null,
      paymentConfirmedBy: booking.paymentConfirmedBy ?? null,
      user: booking.userId ? ({ id: booking.userId as string } as any) : null,
      contact: booking.contactId
        ? ({ id: booking.contactId as string } as any)
        : null,
      court: { id: booking.courtId } as any,
      payment: booking.paymentId
        ? ({ id: booking.paymentId as string } as any)
        : null,
      title: booking.title,
      start_time: booking.startTime,
      end_time: booking.endTime,
      status: booking.status,
      date: booking.date,
      priceApplied: booking.priceApplied ?? null,
      currencyApplied: booking.currencyApplied ?? null,
      slotApplied: booking.slotApplied ?? null,
      pricingSource: booking.pricingSource ?? null,
      cutoffApplied: booking.cutoffApplied ?? null,
    };

    const entity = this.repo.create(payload as DeepPartial<BookingSchema>);
    const saved = await this.repo.save(entity);

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
      userId: schema.userId ?? schema.user?.id ?? null,
      courtId: Number(schema.courtId ?? schema.court?.id),
      paymentId: schema.paymentId ?? schema.payment?.id ?? null,
      paymentMethod: schema.paymentMethod ?? PaymentMethod.Pendiente,
      paymentStatus: schema.paymentStatus ?? PaymentStatus.Pending,
      paidAt: schema.paidAt ?? null,
      paymentConfirmedBy: schema.paymentConfirmedBy ?? null,
      startTime: schema.start_time,
      endTime: schema.end_time,
      status: schema.status,
      date: schema.date,
      title: schema.title ?? null,
      phoneNumber: schema.contact?.waPhone,
      contactId: schema.contactId ?? schema.contact?.id ?? undefined,
      createdAt: (schema as any).createdAt ?? undefined,
      updatedAt: (schema as any).updatedAt ?? undefined,
      canceledAt: (schema as any).canceledAt ?? undefined,
      cancelReason: (schema as any).cancelReason ?? undefined,
      canceledBy: (schema as any).canceledBy ?? undefined,
      priceApplied: schema.priceApplied ?? null,
      currencyApplied: schema.currencyApplied ?? null,
      slotApplied: schema.slotApplied ?? null,
      pricingSource: schema.pricingSource ?? null,
      cutoffApplied: schema.cutoffApplied ?? null,
    };
  }
}
