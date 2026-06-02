import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CourtScheduleWindowRepository } from '../../domain/repositories/court-schedule-window.repository';

@Injectable()
export class CourtScheduleSeederService implements OnModuleInit {
  constructor(
    @Inject('CourtScheduleWindowRepository')
    private readonly repo: CourtScheduleWindowRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedCourtType('padel', [
      {
        courtType: 'padel',
        label: 'Turno AM',
        emoji: '🌞',
        openTime: '07:00',
        closeTime: '13:00',
        slotMinutes: 90,
        priceSlot: 'AM',
        sortOrder: 1,
      },
      {
        courtType: 'padel',
        label: 'Turno PM',
        emoji: '🌙',
        openTime: '17:00',
        closeTime: '23:00',
        slotMinutes: 90,
        priceSlot: 'PM',
        sortOrder: 2,
      },
    ]);

    await this.seedCourtType('futbol', [
      {
        courtType: 'futbol',
        label: 'Bloque día',
        emoji: '☀️',
        openTime: '08:00',
        closeTime: '15:00',
        slotMinutes: 60,
        priceSlot: 'AM',
        sortOrder: 1,
      },
      {
        courtType: 'futbol',
        label: 'Bloque tarde/noche',
        emoji: '🌙',
        openTime: '17:00',
        closeTime: '23:59',
        slotMinutes: 60,
        priceSlot: 'PM',
        sortOrder: 2,
      },
    ]);
  }

  private async seedCourtType(
    courtType: string,
    windows: Parameters<CourtScheduleWindowRepository['createMany']>[0],
  ): Promise<void> {
    const count = await this.repo.countByCourtType(courtType);

    if (count > 0) return;

    await this.repo.createMany(windows);
  }
}
