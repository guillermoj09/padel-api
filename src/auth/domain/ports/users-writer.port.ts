import { AuthUser } from '../entities/auth-user';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string; // plain o hash, según tu use-case
  type: 'cliente' | 'administrador';
};

export abstract class UsersWriterPort {
  abstract create(data: CreateUserInput): Promise<AuthUser>;
}
