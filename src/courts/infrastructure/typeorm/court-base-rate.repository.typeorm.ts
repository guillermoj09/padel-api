import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BaseRateAtResult,
  ChangeBaseRateParams,
  CourtBaseRateRepository,
} from '../../domain/repositories/court-base-rate.repository';
import { CourtBaseRateHistorySchema } from './entities/court-base-rate-history.schema';

@Injectable()
export class CourtBaseRateRepositoryTypeorm implements CourtBaseRateRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CourtBaseRateHistorySchema)
    private readonly repo: Repository<CourtBaseRateHistorySchema>,
  ) {}

  async changeBaseRate(params: ChangeBaseRateParams): Promise<BaseRateAtResult> {
    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      const r = manager.getRepository(CourtBaseRateHistorySchema);

      // bloquea la vigente para evitar 2 "vigentes" por race condition
      const current = await r
        .createQueryBuilder('x')
        .setLock('pessimistic_write')
        .where('x.courtId = :courtId', { courtId: params.courtId })
        .andWhere('x.effectiveTo IS NULL')
        .getOne();

      if (current) {
        current.effectiveTo = now;
        await r.save(current);
      }

      const created = r.create({
        courtId: params.courtId,
        amPrice: params.amPrice,
        pmPrice: params.pmPrice,
        currency: params.currency ?? 'CLP',
        priceCutoff: params.priceCutoff ?? null,
        effectiveFrom: now,
        effectiveTo: null,
        setByAdminId: params.setByAdminId ?? null,
      });

      const saved = await r.save(created);

      return {
        courtId: saved.courtId,
        amPrice: saved.amPrice,
        pmPrice: saved.pmPrice,
        currency: saved.currency,
        priceCutoff: saved.priceCutoff ?? null,
        effectiveFrom: saved.effectiveFrom,
        effectiveTo: saved.effectiveTo ?? null,
      };
    });
  }

  async getBaseRateAt(courtId: number, at: Date): Promise<BaseRateAtResult | null> {
    const row = await this.repo
      .createQueryBuilder('r')
      .where('r.courtId = :courtId', { courtId })
      .andWhere('r.effectiveFrom <= :d', { d: at.toISOString() })
      .andWhere('(r.effectiveTo IS NULL OR r.effectiveTo > :d)', { d: at.toISOString() })
      .orderBy('r.effectiveFrom', 'DESC')
      .getOne();

    if (!row) return null;

    return {
      courtId: row.courtId,
      amPrice: row.amPrice,
      pmPrice: row.pmPrice,
      currency: row.currency,
      priceCutoff: row.priceCutoff ?? null,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
    };
  }

  async listHistory(courtId: number, limit = 50): Promise<BaseRateAtResult[]> {
    const rows = await this.repo.find({
      where: { courtId },
      order: { effectiveFrom: 'DESC' },
      take: limit,
    });

    return rows.map((row) => ({
      courtId: row.courtId,
      amPrice: row.amPrice,
      pmPrice: row.pmPrice,
      currency: row.currency,
      priceCutoff: row.priceCutoff ?? null,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
    }));
  }
}