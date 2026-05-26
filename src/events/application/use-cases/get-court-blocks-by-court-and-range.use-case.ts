import { Inject, Injectable } from '@nestjs/common';
import { CourtBlockRepository } from '../../domain/repositories/court-block.repository';

@Injectable()
export class GetCourtBlocksByCourtAndRangeUseCase {
  constructor(
    @Inject('CourtBlockRepository')
    private readonly blocksRepo: CourtBlockRepository,
  ) {}

  async execute(courtId: string, from: Date, to: Date) {
    return this.blocksRepo.findByCourtAndDateRange(courtId, from, to);
  }
}
