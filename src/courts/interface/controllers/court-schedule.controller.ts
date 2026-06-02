import { Controller, Get, Query } from '@nestjs/common';
import { CourtAvailabilityService } from '../../application/services/court-availability.service';

@Controller('courts')
export class CourtScheduleController {
  constructor(private readonly availability: CourtAvailabilityService) {}

  @Get('schedule-windows')
  async scheduleWindows(@Query('courtType') courtType = 'futbol') {
    const windows = await this.availability.getScheduleWindows(courtType);

    return windows.map((window) => ({
      id: window.id,
      courtType: window.courtType,
      label: window.label,
      emoji: window.emoji,
      openTime: window.openTime,
      closeTime: window.closeTime,
      slotMinutes: window.slotMinutes,
      sortOrder: window.sortOrder,
      active: window.active,
    }));
  }
}
