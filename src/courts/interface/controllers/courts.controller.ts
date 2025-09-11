import { Controller, Get, Query } from '@nestjs/common';
import { ListCourtsUseCase } from '../../application/use-cases/list-courts.use-case';
import { GetCourtsQuery } from '../dto/get-courts.query';
import { ListCourtsQuery } from '../../application/dto/list-courts.query';
import { CourtsPresenter } from '../presenters/courts.presenter';

@Controller('courts')
export class CourtsController {
  constructor(private readonly listCourts: ListCourtsUseCase) {}

  @Get()
  async list(@Query() q: GetCourtsQuery) {
    const query = new ListCourtsQuery(
      q.q,
      typeof q.active === 'string' ? q.active === 'true' : undefined,
      q.limit ?? 10,
    );
    const result = await this.listCourts.execute(query);
    return CourtsPresenter.toHttpList(result);
  }
}