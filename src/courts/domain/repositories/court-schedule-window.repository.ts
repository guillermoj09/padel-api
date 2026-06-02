import { CourtScheduleWindow, PriceSlot } from '../entities/court-schedule-window';

export type CreateCourtScheduleWindowInput = {
  courtType: string;
  label: string;
  emoji?: string | null;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  priceSlot?: PriceSlot;
  sortOrder?: number;
  active?: boolean;
};

export interface CourtScheduleWindowRepository {
  findActiveByCourtType(courtType: string): Promise<CourtScheduleWindow[]>;
  countByCourtType(courtType: string): Promise<number>;
  createMany(input: CreateCourtScheduleWindowInput[]): Promise<CourtScheduleWindow[]>;
}
