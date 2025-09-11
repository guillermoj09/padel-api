import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';

import {
  CourtsRepository,
  ListCourtsParams,
} from '../../domain/repositories/courts.repository';
import { Court } from '../../domain/entities/court';
import { CourtSchema } from './entities/court.schema';

@Injectable()
export class CourtsRepositoryTypeorm implements CourtsRepository {
  constructor(
    @InjectRepository(CourtSchema)
    private readonly repo: Repository<CourtSchema>,
  ) {}

  async list(params: ListCourtsParams): Promise<Court[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.active'])
      .orderBy('c.id', 'ASC');

    if (typeof params.active === 'boolean') {
      qb.andWhere('c.active = :active', { active: params.active });
    }
    // import { Repository } from 'typeorm';  // ya no necesitas Brackets si no lo usas

    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      qb.andWhere('c.name ILIKE :q', { q: `%${q}%` });
    }

    qb.take(params.limit ?? 10);

    const rows = await qb.getMany();
    return rows.map((r) => new Court(r.id, r.name, r.active));
  }

  async getById(id: number | string): Promise<Court | null> {
    const numId = Number(id);
    const row = await this.repo.findOne({ where: { id: numId } });
    return row ? new Court(row.id, row.name, row.active) : null;
  }

  async exists(id: number | string): Promise<boolean> {
    const numId = Number(id);
    const count = await this.repo.count({ where: { id: numId } });
    return count > 0;
  }
}
