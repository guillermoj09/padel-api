import { Court } from '../entities/court';

export type ListCourtsParams = {
  q?: string;
  active?: boolean;
  limit?: number;
};

export interface CourtsRepository {
  list(params: ListCourtsParams): Promise<Court[]>;
  getById(id: number | string): Promise<Court | null>;
  exists(id: number | string): Promise<boolean>;
}