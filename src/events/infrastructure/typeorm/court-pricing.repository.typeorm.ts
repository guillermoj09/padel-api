import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourtPricingRepository } from '../../domain/repositories/court-pricing.repository';
import { Court } from './entities/court.schema';
import { CourtDailyRateSchema } from 'src/courts/infrastructure/typeorm/entities/court-daily-rate.schema';

@Injectable()
export class CourtPricingRepositoryTypeorm implements CourtPricingRepository {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepo: Repository<Court>,
    @InjectRepository(CourtDailyRateSchema)
    private readonly dailyRepo: Repository<CourtDailyRateSchema>,
  ) {}

  async getPricingFor(courtId: number, dateYmd: string) {
  const court = await this.courtRepo.findOne({ where: { id: courtId } });
  if (!court) throw new Error('COURT_NOT_FOUND');

  const daily = await this.dailyRepo.findOne({
    where: { courtId, date: dateYmd },
  });

  if (daily) {
    return {
      amPrice: daily.amPrice,
      pmPrice: daily.pmPrice,
      currency: daily.currency ?? court.currency ?? 'CLP',
      cutoff: court.priceCutoff ?? null, // ✅ rename
      source: 'DAILY' as const,
    };
  }

  return {
    amPrice: court.defaultAmPrice,
    pmPrice: court.defaultPmPrice,
    currency: court.currency ?? 'CLP',
    cutoff: court.priceCutoff ?? null, // ✅ rename
    source: 'COURT_DEFAULT' as const,
  };
}
}