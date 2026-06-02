import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CourtAvailabilityService } from '../../application/services/court-availability.service';
import {
  AvailabilityCourtsQuery,
  AvailabilityHoursQuery,
} from '../dto/availability.query';
import { isValidHHmm, isValidYMD } from '../../../whatsapp/application/services/time.utils';

@Controller('courts/availability')
export class CourtAvailabilityController {
  constructor(private readonly availability: CourtAvailabilityService) {}

  @Get('hours')
  async hours(@Query() query: AvailabilityHoursQuery) {
    const courtType = this.requireCourtType(query.courtType);
    const date = this.requireDate(query.date);
    const blocks = await this.availability.getAvailableHours(courtType, date);

    return {
      courtType,
      date,
      blocks: blocks.map(({ window, slots }) => ({
        window: {
          id: window.id,
          label: window.label,
          emoji: window.emoji,
          openTime: window.openTime,
          closeTime: window.closeTime,
          slotMinutes: window.slotMinutes,
        },
        slots: slots.map((slot) => ({
          time: slot.time,
          startTime: slot.start.toISOString(),
          endTime: slot.end.toISOString(),
        })),
      })),
    };
  }

  @Get('courts')
  async courts(@Query() query: AvailabilityCourtsQuery) {
    const courtType = this.requireCourtType(query.courtType);
    const date = this.requireDate(query.date);
    const time = this.requireTime(query.time);

    const result = await this.availability.getAvailableCourtsForTime(
      courtType,
      date,
      time,
    );

    return {
      courtType,
      date,
      time,
      slot: result.slot
        ? {
            startTime: result.slot.start.toISOString(),
            endTime: result.slot.end.toISOString(),
          }
        : null,
      window: result.window
        ? {
            id: result.window.id,
            label: result.window.label,
            emoji: result.window.emoji,
            openTime: result.window.openTime,
            closeTime: result.window.closeTime,
            slotMinutes: result.window.slotMinutes,
          }
        : null,
      courts: result.courts.map((court) => ({
        id: court.id,
        name: court.name,
        type: court.type,
        active: court.active,
        defaultAmPrice: court.defaultAmPrice,
        defaultPmPrice: court.defaultPmPrice,
        currency: court.currency,
        priceCutoff: court.priceCutoff,
      })),
    };
  }

  private requireCourtType(value?: string): string {
    const courtType = String(value ?? '').trim().toLowerCase();

    if (!courtType) {
      throw new BadRequestException('courtType es requerido. Ejemplo: futbol');
    }

    return courtType;
  }

  private requireDate(value?: string): string {
    const date = String(value ?? '').trim();

    if (!isValidYMD(date)) {
      throw new BadRequestException('date debe tener formato YYYY-MM-DD.');
    }

    return date;
  }

  private requireTime(value?: string): string {
    const time = String(value ?? '').trim();

    if (!isValidHHmm(time)) {
      throw new BadRequestException('time debe tener formato HH:mm.');
    }

    return time;
  }
}
