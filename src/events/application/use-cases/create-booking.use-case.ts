// src/events/application/use-cases/create-booking.use-case.ts
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from 'src/events/domain/entities/booking';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { mapPricingSource } from '../mappers/pricing-source.mapper';

// 👇 para leer court defaults + daily override SIN romper tu arquitectura actual,
// te inyecto un repo de pricing con token (igual que BookingRepository).
// Debes crearlo e implementarlo con TypeORM (te digo abajo).
import { CourtPricingRepository } from '../../domain/repositories/court-pricing.repository';
function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function slotByCutoff(d: Date, cutoff: string | null | undefined) {
  if (!cutoff) return 'PM' as const;
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins < hhmmToMinutes(cutoff) ? ('AM' as const) : ('PM' as const);
}

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') private readonly repo: BookingRepository,
    @Inject('CourtPricingRepository') private readonly pricingRepo: CourtPricingRepository,
  ) { }
  async execute(dto: CreateBookingDto): Promise<Booking> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }
    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      throw new ConflictException('endTime inválido (debe ser mayor a startTime)');
    }

    // ✅ VALIDACIÓN solapamiento
    const conflict = await this.repo.existsActiveOverlap(dto.courtId, start, end);
    if (conflict) {
      throw new ConflictException(
        'Ya existe una reserva activa en ese día/horario para esa cancha.',
      );
    }

    // =============================
    // 🔥 PRICING SNAPSHOT
    // =============================
    const ymd = start.toISOString().slice(0, 10);

    const pricingRaw = await this.pricingRepo.getPricingFor(
      dto.courtId,
      ymd,
    );

    // ✅ usar nombre correcto
    const cutoff = pricingRaw.cutoff ?? null;
    // 🚫 validar cruce de cutoff
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

    // =============================
    // 🎯 Resolver slot
    // =============================
    const slot = slotByCutoff(start, cutoff);

    // =============================
    // 💰 Precio final por reserva
    // (tu sistema sigue proporcional)
    // =============================
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    const pricePerHour =
      slot === 'AM' ? pricingRaw.amPrice : pricingRaw.pmPrice;

    if (pricePerHour == null) {
      throw new ConflictException('No hay tarifa configurada para esta cancha.');
    }

    const total = Math.round((pricePerHour * minutes) / 60);

    // =============================
    // 🧾 SNAPSHOT NORMALIZADO
    // =============================
    const pricing = {
      price: total,
      currency: pricingRaw.currency,
      slot,
      source: pricingRaw.source,
      cutoff,
    };

    console.log('PRICING FINAL →', pricing);

    // =============================
    // 🧱 Crear reserva
    // =============================
    const toCreate: Omit<Booking, 'id'> = {
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      startTime: start,
      endTime: end,
      date: ymd,
      status: dto.status ?? BookingStatus.Confirmed,
      contactId: dto.contactId ?? undefined,
      title: dto.title ?? null,

      // ✅ snapshot correcto
      priceApplied: pricing.price,
      currencyApplied: pricing.currency,
      slotApplied: pricing.slot,
      pricingSource: mapPricingSource(pricing.source),
      cutoffApplied: pricing.cutoff,
    };

    return this.repo.create(toCreate);
  }






}