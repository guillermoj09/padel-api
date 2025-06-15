import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSchema } from './infrastructure/typeorm/entities/event.schema';
import { EventController } from './interface/controllers/event.controller';
import { TypeOrmEventRepository } from './infrastructure/typeorm/event.repository.typeorm';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { GetEventsUseCase } from './application/use-cases/get-events.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([EventSchema])],
  controllers: [EventController],
  providers: [
    CreateEventUseCase,
    GetEventsUseCase,
    {
      provide: 'EventRepository',
      useClass: TypeOrmEventRepository,
    },
  ],
})
export class EventsModule {}
