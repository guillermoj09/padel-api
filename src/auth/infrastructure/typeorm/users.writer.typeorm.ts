import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UsersWriterPort,
  CreateUserInput,
} from '../../domain/ports/users-writer.port';
import { AuthUser } from '../../domain/entities/auth-user';
import { User } from '../events-bridge/user.schema.bridge';

const toDomain = (u: User): AuthUser =>
  new AuthUser(u.id, u.email, u.password, u.type as any, (u as any).name, (u as any).tokenVersion ?? 0);

@Injectable()
export class UsersWriterTypeorm implements UsersWriterPort {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(data: CreateUserInput): Promise<AuthUser> {
    const exists = await this.repo.exist({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const entity = this.repo.create({
      name: data.name,
      email: data.email,
      password: data.password, // hash
      type: data.type,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.repo.increment({ id: userId }, 'tokenVersion', 1);
  }
}
