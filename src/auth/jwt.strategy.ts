// src/auth/infrastructure/jwt/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
  constructor() {
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
  }) {
    // normaliza rol por si usas RolesGuard
    const role = (payload.role ?? payload.type ?? 'cliente').toLowerCase();
    return { id: payload.sub, email: payload.email, role, type: role };
  }
}
