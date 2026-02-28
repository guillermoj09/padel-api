import { Inject } from '@nestjs/common';
import { CourtBaseRateRepository } from '../../domain/repositories/court-base-rate.repository';

export class ChangeCourtBaseRateUseCase {
  constructor(
    @Inject('CourtBaseRateRepository')
    private readonly repo: CourtBaseRateRepository,
  ) {}

  async execute(params: {
    courtId: number;
    amPrice: number;
    pmPrice: number;
    currency?: string;
    priceCutoff?: string | null;
    setByAdminId?: string | null;
  }) {
    if (params.amPrice < 0 || params.pmPrice < 0) {
      throw new Error('PRICE_INVALID');
    }
    return this.repo.changeBaseRate(params);
  }
}