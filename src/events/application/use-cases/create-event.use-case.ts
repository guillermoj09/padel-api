import { Inject, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event';

interface CreateEventInput {
  title: string;
  start: Date;
  end: Date;
  courtId: number;
}

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject('EventRepository') // 👈 usa el token
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(input: CreateEventInput): Promise<Event> {
    return this.eventRepo.create(input);
  }
}
