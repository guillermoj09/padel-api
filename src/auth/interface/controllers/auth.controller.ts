import {
  Body,
  Controller,
  Post,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UsersWriterPort } from 'src/auth/domain/ports/users-writer.port';
import { UsersReaderPort } from 'src/auth/domain/ports/users-reader.port';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUc: LoginUseCase,
    private readonly registerUc: RegisterUseCase,
    private readonly jwt: JwtService,
    private readonly usersWriter: UsersWriterPort,
    private readonly usersReader: UsersReaderPort,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.loginUc.execute({
      email: dto.email,
      password: dto.password,
    });
    console.log("Login" + access_token);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
    console.log("Fallo");

    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as any).user as { id: string } | undefined;
    if (user?.id) {
      await this.usersWriter.incrementTokenVersion(user.id);
    }

    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: false,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    return { ok: true, message: 'Sesión cerrada' };
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
