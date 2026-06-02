import { Inject, Injectable } from '@nestjs/common';
import { Court } from '../../domain/entities/court';
import { CourtScheduleWindow } from '../../domain/entities/court-schedule-window';
import { CourtScheduleWindowRepository } from '../../domain/repositories/court-schedule-window.repository';
import { COURTS_READER, CourtsReaderPort } from '../../domain/ports/courts-reader.port';
import { BookingRepository } from '../../../events/domain/repositories/booking.repository';
import { CourtBlockRepository } from '../../../events/domain/repositories/court-block.repository';
import {
  getAvailableHours,
  makeStartEndTZ,
  TZ,
} from '../../../whatsapp/application/services/time.utils';

export type AvailabilitySlot = {
  time: string;
  start: Date;
  end: Date;
};

export type AvailabilityBlock = {
  window: CourtScheduleWindow;
  slots: AvailabilitySlot[];
};

@Injectable()
export class CourtAvailabilityService {
  constructor(
    @Inject('CourtScheduleWindowRepository')
    private readonly schedules: CourtScheduleWindowRepository,
    @Inject(COURTS_READER)
    private readonly courtsReader: CourtsReaderPort,
    @Inject('BookingRepository')
    private readonly bookings: BookingRepository,
    @Inject('CourtBlockRepository')
    private readonly courtBlocks: CourtBlockRepository,
  ) {}

  async getScheduleWindows(courtType: string): Promise<CourtScheduleWindow[]> {
    return this.schedules.findActiveByCourtType(this.normalizeCourtType(courtType));
  }

  async getAvailableHours(
    courtType: string,
    ymd: string,
  ): Promise<AvailabilityBlock[]> {
    const windows = await this.getScheduleWindows(courtType);
    const courts = await this.listActiveCourts(courtType);

    if (!windows.length) return [];

    if (!courts.length) {
      return windows.map((window) => ({ window, slots: [] }));
    }

    const busyByCourt = await this.getBusyByCourt(courts, ymd);

    return windows.map((window) => {
      const baseHours = getAvailableHours(ymd, {
        open: window.openTime,
        close: window.closeTime,
        slotMinutes: window.slotMinutes,
      });

      const slots = baseHours
        .map((time) => this.buildSlot(ymd, time, window))
        .filter((slot) =>
          courts.some((court) =>
            this.isCourtFreeForSlot(busyByCourt.get(court.id) ?? [], slot),
          ),
        );

      return { window, slots };
    });
  }

  async getAvailableCourtsForTime(
    courtType: string,
    ymd: string,
    time: string,
  ): Promise<{ window: CourtScheduleWindow | null; slot: AvailabilitySlot | null; courts: Court[] }> {
    const window = await this.resolveWindowByTime(courtType, time);

    if (!window) {
      return { window: null, slot: null, courts: [] };
    }

    const allowedHours = getAvailableHours(ymd, {
      open: window.openTime,
      close: window.closeTime,
      slotMinutes: window.slotMinutes,
    });

    if (!allowedHours.includes(time)) {
      return { window, slot: null, courts: [] };
    }

    const slot = this.buildSlot(ymd, time, window);
    const courts = await this.listActiveCourts(courtType);
    const busyByCourt = await this.getBusyByCourt(courts, ymd);

    return {
      window,
      slot,
      courts: courts.filter((court) =>
        this.isCourtFreeForSlot(busyByCourt.get(court.id) ?? [], slot),
      ),
    };
  }

  async resolveWindowByTime(
    courtType: string,
    time: string,
  ): Promise<CourtScheduleWindow | null> {
    const minutes = this.hhmmToMinutes(time);
    const windows = await this.getScheduleWindows(courtType);

    return (
      windows.find((window) => {
        const open = this.hhmmToMinutes(window.openTime);
        const close = this.hhmmToMinutes(window.closeTime);
        return minutes >= open && minutes < close;
      }) ?? null
    );
  }

  buildSlot(
    ymd: string,
    time: string,
    window: CourtScheduleWindow,
  ): AvailabilitySlot {
    const startEnd = makeStartEndTZ(ymd, time, TZ, window.slotMinutes);
    const windowClose = makeStartEndTZ(ymd, window.closeTime, TZ, 0).start;

    return {
      time,
      start: startEnd.start,
      end: startEnd.end > windowClose ? windowClose : startEnd.end,
    };
  }

  private async listActiveCourts(courtType: string): Promise<Court[]> {
    return this.courtsReader.list({
      active: true,
      type: this.normalizeCourtType(courtType),
      limit: 100,
    });
  }

  private async getBusyByCourt(
    courts: Court[],
    ymd: string,
  ): Promise<Map<number, Array<{ startTime: string | Date; endTime: string | Date }>>> {
    const dayStart = makeStartEndTZ(ymd, '00:00', TZ, 0).start;
    const dayEnd = new Date(
      makeStartEndTZ(ymd, '23:59', TZ, 0).start.getTime() + 60 * 1000,
    );

    const pairs = await Promise.all(
      courts.map(async (court) => {
        const [bookings, blocks] = await Promise.all([
          this.bookings.findByCourtAndDateRange(
            String(court.id),
            dayStart,
            dayEnd,
          ),
          this.courtBlocks.findByCourtAndDateRange(
            String(court.id),
            dayStart,
            dayEnd,
          ),
        ]);

        const busy: Array<{ startTime: string | Date; endTime: string | Date }> = [
          ...bookings.map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          })),
          ...blocks.map((block) => ({
            startTime: block.startTime,
            endTime: block.endTime,
          })),
        ];

        return [court.id, busy] as [
          number,
          Array<{ startTime: string | Date; endTime: string | Date }>,
        ];
      }),
    );

    return new Map(pairs);
  }

  private isCourtFreeForSlot(
    busy: Array<{ startTime: string | Date; endTime: string | Date }>,
    slot: AvailabilitySlot,
  ): boolean {
    return !busy.some((item) => {
      const busyStart = new Date(item.startTime);
      const busyEnd = new Date(item.endTime);
      return slot.start < busyEnd && slot.end > busyStart;
    });
  }

  private normalizeCourtType(courtType: string): string {
    return String(courtType ?? '').trim().toLowerCase();
  }

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
}
