import { Court } from '../entities/court';

export interface CourtsReaderPort {
  getById(id: number | string): Promise<Court | null>;
  exists(id: number | string): Promise<boolean>;
  list(params?: { q?: string; active?: boolean; limit?: number }): Promise<Court[]>;
}

export const COURTS_READER = 'CourtsReaderPort';