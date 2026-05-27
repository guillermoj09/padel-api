import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CancelCourtBlockUseCase } from '../../application/use-cases/cancel-court-block.use-case';
import { CreateCourtBlockUseCase } from '../../application/use-cases/create-court-block.use-case';
import { GetCourtBlocksByCourtAndRangeUseCase } from '../../application/use-cases/get-court-blocks-by-court-and-range.use-case';
import { CancelCourtBlockDto } from '../dto/cancel-court-block.dto';
import { CreateCourtBlockDto } from '../dto/create-court-block.dto';

@Controller('court-blocks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('administrador')
export class CourtBlocksController {
  constructor(
    private readonly createCourtBlockUseCase: CreateCourtBlockUseCase,
    private readonly cancelCourtBlockUseCase: CancelCourtBlockUseCase,
    private readonly getCourtBlocksByCourtAndRangeUseCase: GetCourtBlocksByCourtAndRangeUseCase,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(
    @Body() dto: CreateCourtBlockDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id as string | undefined;
    if (!userId) throw new UnauthorizedException('Sin usuario');

    return this.createCourtBlockUseCase.execute(dto, `admin:${userId}`);
  }

  @Patch(':id/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelCourtBlockDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id as string | undefined;
    if (!userId) throw new UnauthorizedException('Sin usuario');

    return this.cancelCourtBlockUseCase.execute(id, {
      by: `admin:${userId}`,
      reason: dto.reason ?? null,
    });
  }

  @Get('court/:courtId')
  async listByCourtAndRange(
    @Param('courtId') courtId: string,
    @Query('from') from: Date,
    @Query('to') to: Date,
  ) {
    return this.getCourtBlocksByCourtAndRangeUseCase.execute(courtId, from, to);
  }
}
