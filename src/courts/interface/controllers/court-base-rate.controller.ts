import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChangeCourtBaseRateUseCase } from '../../application/use-cases/change-court-base-rate.use-case';
import { GetCourtBaseRateAtUseCase } from '../../application/use-cases/get-court-base-rate-at.use-case';
import { ChangeCourtBaseRateDto } from '../dto/change-court-base-rate.dto';

@Controller('courts/:courtId/base-rate')
export class CourtBaseRateController {
  constructor(
    private readonly changeUC: ChangeCourtBaseRateUseCase,
    private readonly getAtUC: GetCourtBaseRateAtUseCase,
  ) {}

  @Post()
  async change(
    @Param('courtId') courtId: string,
    @Body() dto: ChangeCourtBaseRateDto,
  ) {
    return this.changeUC.execute({
      courtId: Number(courtId),
      amPrice: dto.amPrice,
      pmPrice: dto.pmPrice,
      currency: dto.currency,
      priceCutoff: dto.priceCutoff ?? null,
      // si ya tienes auth/admin guard, aquí puedes setear setByAdminId desde req.user
      setByAdminId: null,
    });
  }

  // ejemplo: /courts/1/base-rate/at?at=2026-02-20T18:00:00.000Z
  @Get('at')
  async getAt(
    @Param('courtId') courtId: string,
    @Query('at') at: string,
  ) {
    const d = new Date(at);
    return this.getAtUC.execute(Number(courtId), d);
  }
}