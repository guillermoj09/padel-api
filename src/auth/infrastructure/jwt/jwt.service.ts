// src/auth/infrastructure/jwt/nest-jwt-token-signer.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenSignerPort } from '../../domain/ports/token-signer.port';

@Injectable()
export class JwtTokenService implements TokenSignerPort {
  constructor(private readonly jwt: JwtService) {}
  sign(payload: any, expiresIn: string) {
    return this.jwt.signAsync(payload, { expiresIn }); // secreto viene del JwtModule
  }
}
