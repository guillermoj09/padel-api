import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourtScheduleWindow } from '../../domain/entities/court-schedule-window';
import {
  CourtScheduleWindowRepository,
  CreateCourtScheduleWindowInput,
} from '../../domain/repositories/court-schedule-window.repository';
import { CourtScheduleWindowSchema } from './entities/court-schedule-window.schema';

@Injectable()
export class CourtScheduleWindowRepositoryTypeorm
  implements CourtScheduleWindowRepository
{
  constructor(
    @InjectRepository(CourtScheduleWindowSchema)
    private readonly repo: Repository<CourtScheduleWindowSchema>,
  ) {}

  async findActiveByCourtType(courtType: string): Promise<CourtScheduleWindow[]> {
    const rows = await this.repo.find({
      where: {
        courtType: courtType.trim().toLowerCase(),
        active: true,
      },
      order: {
        sortOrder: 'ASC',
        openTime: 'ASC',
        id: 'ASC',
      },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async countByCourtType(courtType: string): Promise<number> {
    return this.repo.count({
      where: { courtType: courtType.trim().toLowerCase() },
    });
  }

  async createMany(
    input: CreateCourtScheduleWindowInput[],
  ): Promise<CourtScheduleWindow[]> {
    const rows = input.map((item) =>
      this.repo.create({
        courtType: item.courtType.trim().toLowerCase(),
        label: item.label,
        emoji: item.emoji ?? null,
        openTime: item.openTime,
        closeTime: item.closeTime,
        slotMinutes: item.slotMinutes,
        sortOrder: item.sortOrder ?? 0,
        active: item.active ?? true,
      }),
    );

    const saved = await this.repo.save(rows);
    return saved.map((row) => this.toDomain(row));
  }

  private toDomain(row: CourtScheduleWindowSchema): CourtScheduleWindow {
    return new CourtScheduleWindow(
      row.id,
      row.courtType,
      row.label,
      row.emoji,
      row.openTime,
      row.closeTime,
      row.slotMinutes,
      row.sortOrder,
      row.active,
    );
  }
}
