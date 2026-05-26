import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CourtBlock } from '../../domain/entities/court-block';
import { CourtBlockRepository } from '../../domain/repositories/court-block.repository';

@Injectable()
export class CancelCourtBlockUseCase {
  constructor(
    @Inject('CourtBlockRepository')
    private readonly blocksRepo: CourtBlockRepository,
  ) {}

  async execute(
    id: string,
    input: {
      by?: string | null;
      reason?: string | null;
    },
  ): Promise<CourtBlock> {
    const found = await this.blocksRepo.findById(id);

    if (!found) {
      throw new NotFoundException('Bloqueo no encontrado');
    }

    return this.blocksRepo.cancel(id, input);
  }
}
