import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Not, Repository } from 'typeorm';
import {
  CourtBlock,
  CourtBlockStatus,
} from '../../domain/entities/court-block';
import { CourtBlockRepository } from '../../domain/repositories/court-block.repository';
import { CourtBlockSchema } from './entities/court-block.schema';

@Injectable()
export class TypeOrmCourtBlockRepository implements CourtBlockRepository {
  constructor(
    @InjectRepository(CourtBlockSchema)
    private readonly repo: Repository<CourtBlockSchema>,
  ) {}

  async findById(id: string): Promise<CourtBlock | null> {
    const row = await this.repo.findOne({
      where: { id },
      relations: { court: true },
    });

    return row ? this.toDomain(row) : null;
  }

  async create(block: Omit<CourtBlock, 'id'>): Promise<CourtBlock> {
    const entity = this.repo.create({
      court: { id: block.courtId } as any,
      startTime: block.startTime,
      endTime: block.endTime,
      date: block.date,
      type: block.type,
      status: block.status,
      title: block.title ?? null,
      reason: block.reason ?? null,
      createdBy: block.createdBy ?? null,
      cancelledAt: block.cancelledAt ?? null,
      cancelledBy: block.cancelledBy ?? null,
      cancelReason: block.cancelReason ?? null,
      createdAt: block.createdAt ?? null,
      updatedAt: block.updatedAt ?? null,
    });

    const saved = await this.repo.save(entity);
    const reloaded = await this.repo.findOne({
      where: { id: saved.id },
      relations: { court: true },
    });

    if (!reloaded) {
      throw new ConflictException('No se pudo guardar el bloqueo');
    }

    return this.toDomain(reloaded);
  }

  async cancel(
    id: string,
    input: { by?: string | null; reason?: string | null },
  ): Promise<CourtBlock> {
    const row = await this.repo.findOne({
      where: { id },
      relations: { court: true },
    });

    if (!row) {
      throw new NotFoundException('Bloqueo no encontrado');
    }

    row.status = CourtBlockStatus.Cancelled;
    row.cancelledAt = new Date();
    row.cancelledBy = input.by ?? null;
    row.cancelReason = input.reason ?? null;
    row.updatedAt = new Date();

    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async existsActiveOverlap(
    courtId: number,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        court: { id: courtId },
        startTime: LessThan(end),
        endTime: MoreThan(start),
        status: Not(CourtBlockStatus.Cancelled),
      },
    });

    return count > 0;
  }

  async findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<CourtBlock[]> {
    const rows = await this.repo.find({
      where: {
        court: { id: Number(courtId) },
        startTime: LessThan(end),
        endTime: MoreThan(start),
        status: Not(CourtBlockStatus.Cancelled),
      },
      relations: { court: true },
      order: { startTime: 'ASC' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: CourtBlockSchema): CourtBlock {
    return {
      id: row.id,
      courtId: row.courtId ?? row.court?.id,
      startTime: row.startTime,
      endTime: row.endTime,
      date: row.date,
      type: row.type,
      status: row.status,
      title: row.title ?? null,
      reason: row.reason ?? null,
      createdBy: row.createdBy ?? null,
      cancelledAt: row.cancelledAt ?? null,
      cancelledBy: row.cancelledBy ?? null,
      cancelReason: row.cancelReason ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  }
}
