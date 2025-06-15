import { Event } from '../entities/event';

export interface EventRepository {
  findAll(): Promise<Event[]>;
  create(event: Omit<Event, 'id'>): Promise<Event>;
}
