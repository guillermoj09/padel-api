import { UsersReaderPort } from '../../domain/ports/users-reader.port';
import { UsersWriterPort } from '../../domain/ports/users-writer.port';
import { TokenSignerPort } from '../../domain/ports/token-signer.port';
import { PasswordService } from '../services/password.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly usersReader: UsersReaderPort,
    private readonly usersWriter: UsersWriterPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: {
    name: string;
    email: string;
    password: string;
    type?: 'cliente' | 'administrador';
  }) {
    const type = input.type ?? 'cliente';

    const already = await this.usersReader.findByEmail(input.email);
    if (already) throw new Error('El email ya está registrado');

    const hashed = await this.passwordService.hash(input.password);
    const created = await this.usersWriter.create({
      name: input.name,
      email: input.email,
      password: hashed,
      type,
    });

    const token = await this.tokenSigner.sign(
      { sub: created.id, email: created.email, type: created.type },
      '7d',
    );
    return { access_token: token };
  }
}
