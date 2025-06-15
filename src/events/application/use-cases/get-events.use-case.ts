import { Injectable, Inject } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event';

@Injectable()
export class GetEventsUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(): Promise<Event[]> {
    return this.eventRepo.findAll();
  }
}
