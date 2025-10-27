// src/auth/infrastructure/jwt/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersReaderPort } from './domain/ports/users-reader.port';
import { ConfigService } from '@nestjs/config';

// Lee desde req.cookies.access_token; si no hay, parsea el header Cookie manualmente
const robustCookieExtractor = (req: any): string | null => {
  if (req?.cookies?.access_token) return req.cookies.access_token; // cookie-parser
  const raw = req?.headers?.cookie;
  if (typeof raw === 'string') {
    const hit = raw
      .split(';')
      .map((s) => s.trim())
      .find((p) => p.startsWith('access_token='));
    if (hit) {
      const [, v] = hit.split('=');
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly usersReader: UsersReaderPort,
  ) {
    const secret = process.env.JWT_SECRET;
    console.log(`${secret}`);
    if (!secret) {
      // fallar temprano; evita firmar/verificar con secretos distintos o undefined
      throw new Error('JWT_SECRET no definido');
    }

    super({
      secretOrKey: secret, // <- SIN fallback
      jwtFromRequest: ExtractJwt.fromExtractors([
        robustCookieExtractor, // <- COOKIE
        ExtractJwt.fromAuthHeaderAsBearerToken(), // <- BEARER (Postman)
      ]),
      ignoreExpiration: false,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    type?: string;
    role?: string;
    v?: number;
  }) {
    const user = await this.usersReader.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no existe');

    if (typeof payload.v !== 'number' || payload.v !== user.tokenVersion) {
      throw new UnauthorizedException('Token invalidado');
    }

    const role = (payload.role ?? payload.type ?? 'cliente').toLowerCase();
    return { id: user.id, email: user.email, role, type: role };
  }
}
