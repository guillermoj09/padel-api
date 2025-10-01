import { Body, Controller, Post, Res } from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUc: LoginUseCase,
    private readonly registerUc: RegisterUseCase,
    private readonly jwt: JwtService,
  ) {}
  // auth.controller.ts (login)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.loginUc.execute(dto);

    // Derivar maxAge desde exp si firmas con expiresIn
    const payload = this.jwt.decode(access_token) as { exp?: number } | null;
    const maxAgeMs = payload?.exp
      ? Math.max(payload.exp * 1000 - Date.now(), 0)
      : 86_400_000;

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false, // ⬅️ false en dev (HTTP), true en prod (HTTPS)
      sameSite: 'lax', // ⬅️ funciona entre puertos en localhost
      path: '/',
      maxAge: maxAgeMs,
    });

    return { ok: true };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.registerUc.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      type: dto.type,
    });
  }
}
