import { CourtBlock } from '../entities/court-block';

export interface CourtBlockRepository {
  findById(id: string): Promise<CourtBlock | null>;

  create(block: Omit<CourtBlock, 'id'>): Promise<CourtBlock>;

  cancel(
    id: string,
    input: {
      by?: string | null;
      reason?: string | null;
    },
  ): Promise<CourtBlock>;

  existsActiveOverlap(
    courtId: number,
    start: Date,
    end: Date,
  ): Promise<boolean>;

  findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<CourtBlock[]>;
}

export const COURT_BLOCK_REPOSITORY = 'CourtBlockRepository';
