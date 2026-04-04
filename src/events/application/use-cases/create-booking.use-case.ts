// src/events/application/use-cases/create-booking.use-case.ts
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from 'src/events/domain/entities/booking';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { mapPricingSource } from '../mappers/pricing-source.mapper';
import { CourtPricingRepository } from '../../domain/repositories/court-pricing.repository';

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function slotByCutoff(hhmm: string, cutoff: string | null | undefined) {
  const mins = hhmmToMinutes(hhmm);

  if (!cutoff) {
    return mins < 13 * 60 ? ('AM' as const) : ('PM' as const);
  }

  return mins < hhmmToMinutes(cutoff) ? ('AM' as const) : ('PM' as const);
}

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') private readonly repo: BookingRepository,
    @Inject('CourtPricingRepository')
    private readonly pricingRepo: CourtPricingRepository,
  ) {}

  async execute(dto: CreateBookingDto): Promise<Booking> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }

    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      throw new ConflictException(
        'endTime inválido (debe ser mayor a startTime)',
      );
    }

    const conflict = await this.repo.existsActiveOverlap(
      dto.courtId,
      start,
      end,
    );

    if (conflict) {
      throw new ConflictException(
        'Ya existe una reserva activa en ese día/horario para esa cancha.',
      );
    }

    const ymd = start.toISOString().slice(0, 10);
    const pricingRaw = await this.pricingRepo.getPricingFor(dto.courtId, ymd);

    const cutoff = pricingRaw.cutoff ?? null;

    if (cutoff) {
      const cutMin = hhmmToMinutes(cutoff);
      const sMin = start.getHours() * 60 + start.getMinutes();
      const eMin = end.getHours() * 60 + end.getMinutes();

      if (sMin < cutMin && eMin > cutMin) {
        throw new ConflictException(
          'La reserva cruza el cambio de tarifa (cutoff).',
        );
      }
    }

    const startHHmm = `${String(start.getHours()).padStart(2, '0')}:${String(
      start.getMinutes(),
    ).padStart(2, '0')}`;

    const slot = slotByCutoff(startHHmm, cutoff);
    const priceApplied =
      slot === 'AM' ? pricingRaw.amPrice : pricingRaw.pmPrice;

    if (priceApplied == null) {
      throw new ConflictException(
        'No hay tarifa configurada para esta cancha.',
      );
    }

    const pricing = {
      price: priceApplied,
      currency: pricingRaw.currency,
      slot,
      source: pricingRaw.source,
      cutoff,
    };

    const toCreate: Omit<Booking, 'id'> = {
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.Pendiente,
      paymentStatus: PaymentStatus.Pending,
      paidAt: null,
      paymentConfirmedBy: null,
      startTime: start,
      endTime: end,
      date: ymd,
      status: dto.status ?? BookingStatus.Confirmed,
      contactId: dto.contactId ?? undefined,
      title: dto.title ?? null,
      priceApplied: pricing.price,
      currencyApplied: pricing.currency,
      slotApplied: pricing.slot,
      pricingSource: mapPricingSource(pricing.source),
      cutoffApplied: pricing.cutoff,
    };

    return this.repo.create(toCreate);
  }
}
