import { Injectable, Inject } from '@nestjs/common';
import { CourtsReaderPort } from '../../domain/ports/courts-reader.port';
import { CourtsRepository } from '../../domain/repositories/courts.repository';
import { Court } from '../../domain/entities/court';

@Injectable()
export class CourtsReaderService implements CourtsReaderPort {
  constructor(
    @Inject('CourtsRepository') private readonly repo: CourtsRepository,
  ) {}

  getById(id: string | number): Promise<Court | null> {
    return this.repo.getById(id);
  }

  exists(id: string | number): Promise<boolean> {
    return this.repo.exists(id);
  }

  list(params?: { q?: string; active?: boolean; limit?: number }): Promise<Court[]> {
    return this.repo.list(params ?? {});
  }
}