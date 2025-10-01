import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersReaderPort } from '../../domain/ports/users-reader.port';
import { AuthUser } from '../../domain/entities/auth-user';
import { User } from '../events-bridge/user.schema.bridge';

@Injectable()
export class UsersReaderTypeorm implements UsersReaderPort {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const u = await this.repo.findOne({ where: { email } });
    if (!u) return null;
    return new AuthUser(u.id, u.email, u.password, u.type as any, u.name);
  }
}
