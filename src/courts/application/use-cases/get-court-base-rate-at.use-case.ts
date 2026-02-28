import { Inject } from '@nestjs/common';
import { CourtBaseRateRepository } from '../../domain/repositories/court-base-rate.repository';

export class GetCourtBaseRateAtUseCase {
  constructor(
    @Inject('CourtBaseRateRepository')
    private readonly repo: CourtBaseRateRepository,
  ) {}

  async execute(courtId: number, at: Date) {
    return this.repo.getBaseRateAt(courtId, at);
  }
}