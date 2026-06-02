import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingsModule } from '../events/bookings.module';
import { CourtBaseRateHistorySchema } from './infrastructure/typeorm/entities/court-base-rate-history.schema';
import { CourtBaseRateRepositoryTypeorm } from './infrastructure/typeorm/court-base-rate.repository.typeorm';
import { ChangeCourtBaseRateUseCase } from './application/use-cases/change-court-base-rate.use-case';
import { GetCourtBaseRateAtUseCase } from './application/use-cases/get-court-base-rate-at.use-case';
import { CourtBaseRateController } from './interface/controllers/court-base-rate.controller';
import { CourtSchema } from './infrastructure/typeorm/entities/court.schema';
import { CourtDailyRateSchema } from './infrastructure/typeorm/entities/court-daily-rate.schema';
import { CourtScheduleWindowSchema } from './infrastructure/typeorm/entities/court-schedule-window.schema';
import { CourtsController } from './interface/controllers/courts.controller';
import { CourtScheduleController } from './interface/controllers/court-schedule.controller';
import { CourtAvailabilityController } from './interface/controllers/court-availability.controller';
import { ListCourtsUseCase } from './application/use-cases/list-courts.use-case';
import { CourtsRepositoryTypeorm } from './infrastructure/typeorm/courts.repository.typeorm';
import { CourtScheduleWindowRepositoryTypeorm } from './infrastructure/typeorm/court-schedule-window.repository.typeorm';
import { COURTS_READER } from './domain/ports/courts-reader.port';
import { CourtsReaderService } from './application/services/courts-reader.service';
import { CourtAvailabilityService } from './application/services/court-availability.service';
import { CourtScheduleSeederService } from './application/services/court-schedule-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourtSchema,
      CourtDailyRateSchema,
      CourtBaseRateHistorySchema,
      CourtScheduleWindowSchema,
    ]),
    BookingsModule,
  ],
  controllers: [
    CourtsController,
    CourtBaseRateController,
    CourtScheduleController,
    CourtAvailabilityController,
  ],
  providers: [
    ListCourtsUseCase,
    ChangeCourtBaseRateUseCase,
    GetCourtBaseRateAtUseCase,

    CourtsRepositoryTypeorm,
    { provide: 'CourtsRepository', useClass: CourtsRepositoryTypeorm },

    CourtBaseRateRepositoryTypeorm,
    {
      provide: 'CourtBaseRateRepository',
      useClass: CourtBaseRateRepositoryTypeorm,
    },

    CourtScheduleWindowRepositoryTypeorm,
    {
      provide: 'CourtScheduleWindowRepository',
      useClass: CourtScheduleWindowRepositoryTypeorm,
    },

    CourtsReaderService,
    { provide: COURTS_READER, useExisting: CourtsReaderService },

    CourtAvailabilityService,
    CourtScheduleSeederService,
  ],
  exports: [
    'CourtsRepository',
    'CourtBaseRateRepository',
    'CourtScheduleWindowRepository',
    COURTS_READER,
    ListCourtsUseCase,
    CourtsReaderService,
    CourtAvailabilityService,
  ],
})
export class CourtsModule {}
