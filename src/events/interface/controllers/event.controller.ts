import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateEventDto } from '../dto/create-event.dto';
import { Event } from '../../domain/entities/event';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case';
import { GetEventsUseCase } from '../../application/use-cases/get-events.use-case';

@Controller('events')
export class EventController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly getEventsUseCase: GetEventsUseCase,
  ) {}

  @Get()
  async findAll(): Promise<Event[]> {
    return this.getEventsUseCase.execute();
  }

  @Post()
  async create(@Body() dto: CreateEventDto): Promise<Event> {
    const start = new Date(dto.start);
    const end = new Date(dto.end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    return this.createEventUseCase.execute({
      title: dto.title,
      start,
      end,
      courtId: dto.courtId,
    });
  }
}
