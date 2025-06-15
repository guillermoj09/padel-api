import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event';
import { EventSchema } from './entities/event.schema';

@Injectable()
export class TypeOrmEventRepository implements EventRepository {
  constructor(
    @InjectRepository(EventSchema)
    private readonly repo: Repository<EventSchema>,
  ) {}

  async findAll(): Promise<Event[]> {
    console.log('2');
    console.log('entro al find All');
    const eventSchemas = await this.repo.find();
    return eventSchemas.map((e) => this.toDomain(e));
  }

  async create(event: Omit<Event, 'id'>): Promise<Event> {
    const newEventSchema = this.repo.create({
      title: event.title,
      start: event.start,
      end: event.end,
      courtId: event.courtId,
    });

    const saved = await this.repo.save(newEventSchema);
    return this.toDomain(saved);
  }

  private toDomain(eventSchema: EventSchema): Event {
    return new Event(
      eventSchema.id,
      eventSchema.title,
      eventSchema.start,
      eventSchema.end,
      eventSchema.courtId,
    );
  }
}
