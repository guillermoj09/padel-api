import { AuthUser } from '../entities/auth-user';

export abstract class UsersReaderPort {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
  // NUEVO: necesario para JwtStrategy.validate
  abstract findById(id: string): Promise<AuthUser | null>;
}
