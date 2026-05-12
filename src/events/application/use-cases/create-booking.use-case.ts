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
import { CourtBlockRepository } from '../../domain/repositories/court-block.repository';
import { getLocalDateTimeParts } from 'src/common/utils/local-date.util';

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
    @Inject('CourtBlockRepository')
    private readonly blocksRepo: CourtBlockRepository,
  ) {}

  async execute(dto: CreateBookingDto): Promise<Booking> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (Number.isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }

    if (Number.isNaN(end.getTime()) || end <= start) {
      throw new ConflictException(
        'endTime inválido (debe ser mayor a startTime)',
      );
    }

    const startLocal = getLocalDateTimeParts(start);
    const endLocal = getLocalDateTimeParts(end);

    if (startLocal.ymd !== endLocal.ymd) {
      throw new ConflictException('La reserva no puede cruzar de día.');
    }

    // Fuente de verdad: la fecha se calcula desde startTime usando America/Santiago.
    // Esto evita errores cuando el frontend manda dto.date con un día corrido por zona horaria.
    const bookingYmd = startLocal.ymd;

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

    const blocked = await this.blocksRepo.existsActiveOverlap(
      dto.courtId,
      start,
      end,
    );

    if (blocked) {
      throw new ConflictException(
        'La cancha está bloqueada en ese día/horario.',
      );
    }

    const pricingRaw = await this.pricingRepo.getPricingFor(
      dto.courtId,
      bookingYmd,
    );

    const cutoff = pricingRaw.cutoff ?? null;

    if (cutoff) {
      const cutMin = hhmmToMinutes(cutoff);
      const sMin = startLocal.minutes;
      const eMin = endLocal.minutes;

      if (sMin < cutMin && eMin > cutMin) {
        throw new ConflictException(
          'La reserva cruza el cambio de tarifa (cutoff).',
        );
      }
    }

    const slot = slotByCutoff(startLocal.hhmm, cutoff);
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
      date: bookingYmd,
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
