import { Controller, Get, Query } from '@nestjs/common';
import { ListCourtsUseCase } from '../../application/use-cases/list-courts.use-case';
import { GetCourtsQuery } from '../dto/get-courts.query';
import { ListCourtsQuery } from '../../application/dto/list-courts.query';
import { CourtsPresenter } from '../presenters/courts.presenter';

@Controller('courts')
export class CourtsController {
  constructor(private readonly listCourts: ListCourtsUseCase) {}

  // src/courts/interface/controllers/courts.controller.ts
  @Get()
  async list(@Query() q: GetCourtsQuery) {
    const active =
      typeof q.active === 'string' ? q.active === 'true' : q.active;
    const limitRaw = (q as any).limit;
    const parsed =
      typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : Number(limitRaw);
    const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;

    const query = new ListCourtsQuery({ q: q.q, active, limit }); // <-- ahora sí
    const result = await this.listCourts.execute(query);
    return CourtsPresenter.toHttpList(result);
  }
}
