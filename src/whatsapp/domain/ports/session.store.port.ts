import { Session } from '../types/session.types';

export interface SessionStorePort {
  get(key: string): Promise<Session | undefined>;
  set(key: string, value: Session): Promise<void>;
  del(key: string): Promise<void>;
}
