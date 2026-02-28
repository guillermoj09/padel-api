import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourtBaseRateHistorySchema } from './infrastructure/typeorm/entities/court-base-rate-history.schema';
import { CourtBaseRateRepositoryTypeorm } from './infrastructure/typeorm/court-base-rate.repository.typeorm';
import { ChangeCourtBaseRateUseCase } from './application/use-cases/change-court-base-rate.use-case';
import { GetCourtBaseRateAtUseCase } from './application/use-cases/get-court-base-rate-at.use-case';
import { CourtBaseRateController } from './interface/controllers/court-base-rate.controller';
import { CourtSchema } from './infrastructure/typeorm/entities/court.schema';
import { CourtDailyRateSchema } from './infrastructure/typeorm/entities/court-daily-rate.schema';
import { CourtsController } from './interface/controllers/courts.controller';
import { ListCourtsUseCase } from './application/use-cases/list-courts.use-case';
import { CourtsRepositoryTypeorm } from './infrastructure/typeorm/courts.repository.typeorm';
import { COURTS_READER } from './domain/ports/courts-reader.port';
import { CourtsReaderService } from './application/services/courts-reader.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourtSchema, CourtDailyRateSchema, CourtBaseRateHistorySchema]),
  ],
  controllers: [CourtsController, CourtBaseRateController],
  providers: [
    ListCourtsUseCase,
    ChangeCourtBaseRateUseCase,
    GetCourtBaseRateAtUseCase,

    CourtsRepositoryTypeorm,
    { provide: 'CourtsRepository', useClass: CourtsRepositoryTypeorm },

    CourtBaseRateRepositoryTypeorm,
    { provide: 'CourtBaseRateRepository', useClass: CourtBaseRateRepositoryTypeorm },

    { provide: COURTS_READER, useClass: CourtsReaderService },
  ],
  exports: [
    { provide: 'CourtsRepository', useClass: CourtsRepositoryTypeorm },
    { provide: 'CourtBaseRateRepository', useClass: CourtBaseRateRepositoryTypeorm },
    { provide: COURTS_READER, useClass: CourtsReaderService },
  ],
})
export class CourtsModule {}