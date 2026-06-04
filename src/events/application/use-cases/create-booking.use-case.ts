// src/events/application/use-cases/create-booking.use-case.ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
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
import { CourtScheduleWindow } from 'src/courts/domain/entities/court-schedule-window';
import { CourtScheduleWindowRepository } from 'src/courts/domain/repositories/court-schedule-window.repository';
import { ContactsRepository } from '../../domain/repositories/contacts.repository';

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

function normalizePhoneToE164(raw?: string | null): string | null {
  const value = String(raw ?? '').trim();

  if (!value) {
    return null;
  }

  const withoutWhatsappPrefix = value.replace(/^whatsapp:/i, '').trim();
  const digitsOrPlus = withoutWhatsappPrefix.replace(/[^0-9+]/g, '');

  if (!digitsOrPlus) {
    return null;
  }

  if (digitsOrPlus.startsWith('+')) {
    return digitsOrPlus;
  }

  return `+${digitsOrPlus}`;
}

type ScheduleWindowResult = {
  hasConfiguredWindows: boolean;
  window: CourtScheduleWindow | null;
};

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') private readonly repo: BookingRepository,
    @Inject('CourtPricingRepository')
    private readonly pricingRepo: CourtPricingRepository,
    @Inject('CourtBlockRepository')
    private readonly blocksRepo: CourtBlockRepository,
    @Inject('CourtScheduleWindowRepository')
    private readonly scheduleWindows: CourtScheduleWindowRepository,
    @Inject('ContactsRepository')
    private readonly contacts: ContactsRepository,
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

    if (start <= new Date()) {
      throw new BadRequestException(
        'No puedes crear una reserva en una hora pasada.',
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

    const schedule = await this.resolveScheduleWindowForTime(
      pricingRaw.courtType,
      startLocal.hhmm,
    );

    const cutoff = pricingRaw.cutoff ?? null;
    let slot: 'AM' | 'PM';
    let cutoffApplied: string | null = cutoff;

    if (schedule.hasConfiguredWindows) {
      if (!schedule.window) {
        throw new ConflictException(
          'El horario no está dentro de los bloques configurados para esta cancha.',
        );
      }

      const closeMinutes = hhmmToMinutes(schedule.window.closeTime);

      if (endLocal.minutes > closeMinutes) {
        throw new ConflictException(
          'La reserva supera el cierre del bloque horario configurado.',
        );
      }

      slot = schedule.window.priceSlot;
      cutoffApplied = null;
    } else {
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

      slot = slotByCutoff(startLocal.hhmm, cutoff);
    }

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
      cutoff: cutoffApplied,
    };

    const contactId = await this.resolveContactId(dto);

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
      contactId,
      title: dto.title ?? null,
      priceApplied: pricing.price,
      currencyApplied: pricing.currency,
      slotApplied: pricing.slot,
      pricingSource: mapPricingSource(pricing.source),
      cutoffApplied: pricing.cutoff,
    };

    return this.repo.create(toCreate);
  }


  private async resolveContactId(
    dto: CreateBookingDto,
  ): Promise<string | undefined> {
    if (dto.contactId) {
      return dto.contactId;
    }

    const phoneNumber = normalizePhoneToE164(dto.phoneNumber);

    if (!phoneNumber) {
      return undefined;
    }

    const contact = await this.contacts.findOrCreateByWaPhone(
      phoneNumber,
      dto.title ?? null,
      'America/Santiago',
    );

    return contact.id;
  }

  private async resolveScheduleWindowForTime(
    courtType: string,
    hhmm: string,
  ): Promise<ScheduleWindowResult> {
    const windows = await this.scheduleWindows.findActiveByCourtType(courtType);

    if (!windows.length) {
      return { hasConfiguredWindows: false, window: null };
    }

    const minutes = hhmmToMinutes(hhmm);
    const window =
      windows.find((item) => {
        const open = hhmmToMinutes(item.openTime);
        const close = hhmmToMinutes(item.closeTime);
        return minutes >= open && minutes < close;
      }) ?? null;

    return { hasConfiguredWindows: true, window };
  }
}
