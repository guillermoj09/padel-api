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

const BUSINESS_TZ = 'America/Santiago';

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

function getLocalDateTimeParts(date: Date, timeZone = BUSINESS_TZ): {
  ymd: string;
  hhmm: string;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const year = String(map.year ?? '0000');
  const month = String(map.month ?? '01');
  const day = String(map.day ?? '01');
  const hour = Number(String(map.hour ?? '00'));
  const minute = Number(String(map.minute ?? '00'));

  return {
    ymd: `${year}-${month}-${day}`,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutes: hour * 60 + minute,
  };
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

    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }

    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      throw new ConflictException(
        'endTime inválido (debe ser mayor a startTime)',
      );
    }

    const startLocal = getLocalDateTimeParts(start);
    const endLocal = getLocalDateTimeParts(end);

    if (startLocal.ymd !== endLocal.ymd) {
      throw new ConflictException('La reserva no puede cruzar de día.');
    }

    const bookingYmd = dto.date?.trim() || startLocal.ymd;

    if (bookingYmd !== startLocal.ymd) {
      throw new ConflictException(
        'La fecha enviada no coincide con el horario de la reserva.',
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

    const pricingRaw = await this.pricingRepo.getPricingFor(dto.courtId, bookingYmd);

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
