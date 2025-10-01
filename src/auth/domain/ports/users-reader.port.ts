import { AuthUser } from '../entities/auth-user';

export abstract class UsersReaderPort {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}
