import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourtSchema } from './infrastructure/typeorm/entities/court.schema';
import { CourtsRepositoryTypeorm } from './infrastructure/typeorm/courts.repository.typeorm';

import { ListCourtsUseCase } from './application/use-cases/list-courts.use-case';
import { CourtsReaderService } from './application/services/courts-reader.service';

import { CourtsController } from './interface/controllers/courts.controller';

import { COURTS_READER } from './domain/ports/courts-reader.port';

@Module({
  imports: [TypeOrmModule.forFeature([CourtSchema])],
  controllers: [CourtsController],
  providers: [
    // Application
    ListCourtsUseCase,
    // Infra
    CourtsRepositoryTypeorm,
    { provide: 'CourtsRepository', useClass: CourtsRepositoryTypeorm },
    // Read port for other modules (Bookings can consume it)
    { provide: COURTS_READER, useClass: CourtsReaderService },
  ],
  exports: [
    { provide: 'CourtsRepository', useClass: CourtsRepositoryTypeorm },
    { provide: COURTS_READER, useClass: CourtsReaderService },
    ListCourtsUseCase,
  ],
})
export class CourtsModule {}
