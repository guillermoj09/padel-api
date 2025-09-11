import { Injectable, Inject } from '@nestjs/common';
import { CourtsRepository, ListCourtsParams } from '../../domain/repositories/courts.repository';
import { ListCourtsQuery } from '../dto/list-courts.query';
import { Court } from '../../domain/entities/court';

const MAX_LIMIT = 10;

@Injectable()
export class ListCourtsUseCase {
  constructor(
    @Inject('CourtsRepository') private readonly repo: CourtsRepository,
  ) {}

  async execute(query: ListCourtsQuery): Promise<Court[]> {
    const params: ListCourtsParams = {
      q: query.q?.trim() || undefined,
      active: query.active,
      limit: Math.min(Math.max(1, query.limit ?? MAX_LIMIT), MAX_LIMIT),
    };
    return this.repo.list(params);
  }
}