import { Injectable } from '@nestjs/common';
import { SessionStorePort } from '../../domain/ports/session.store.port';
import { Session } from '../../domain/types/session.types';

@Injectable()
export class MemorySessionStore implements SessionStorePort {
  private map = new Map<string, Session>();
  get(key: string) { return Promise.resolve(this.map.get(key)); }
  set(key: string, value: Session) { this.map.set(key, value); return Promise.resolve(); }
  del(key: string) { this.map.delete(key); return Promise.resolve(); }
}
