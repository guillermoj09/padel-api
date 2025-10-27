import { UsersReaderPort } from '../../domain/ports/users-reader.port';
import { TokenSignerPort } from '../../domain/ports/token-signer.port';
import { PasswordService } from '../services/password.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usersReader: UsersReaderPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: { email: string; password: string }) {
    const user = await this.usersReader.findByEmail(input.email);
    if (!user) throw new Error('Credenciales inválidas');

    const ok = await this.passwordService.compare(input.password, user.password);
    if (!ok) throw new Error('Credenciales inválidas');

    const role = String(user.type).toLowerCase(); // 'administrador' | 'cliente'

    const token = await this.tokenSigner.sign(
      { sub: user.id, email: user.email, type: role, v: user.tokenVersion as any },
      '7d',
    );

    return { access_token: token };
  }
}
