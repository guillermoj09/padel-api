import { AuthUser } from '../entities/auth-user';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string; // hash
  type: 'cliente' | 'administrador';
};

export abstract class UsersWriterPort {
  abstract create(data: CreateUserInput): Promise<AuthUser>;

  // NUEVO: incrementa la versión para invalidar tokens previos
  abstract incrementTokenVersion(userId: string): Promise<void>;
}
