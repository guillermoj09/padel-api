import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './interface/controllers/auth.controller';
import { AdminController } from './interface/controllers/admin.controller';

import { UsersReaderTypeorm } from './infrastructure/typeorm/users.reader.typeorm';
import { UsersWriterTypeorm } from './infrastructure/typeorm/users.writer.typeorm'; // ⬅️ NUEVO

import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case'; // ⬅️ NUEVO

import { PasswordService } from './application/services/password.service';

import { UsersReaderPort } from './domain/ports/users-reader.port';
import { UsersWriterPort } from './domain/ports/users-writer.port'; // ⬅️ NUEVO
import { TokenSignerPort } from './domain/ports/token-signer.port';

import { User } from './infrastructure/events-bridge/user.schema.bridge';
import { JwtStrategy } from './jwt.strategy';
import { JwtTokenService } from './infrastructure/jwt/jwt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const secret = cfg.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET no definido');
        return {
          secret,
          signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') || '7d' },
        };
      },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController, AdminController],
  providers: [
    // Use cases
    LoginUseCase,
    RegisterUseCase,

    // Services
    PasswordService,
    JwtStrategy,

    // Ports
    { provide: UsersReaderPort, useClass: UsersReaderTypeorm },
    { provide: UsersWriterPort, useClass: UsersWriterTypeorm }, // ⬅️ NUEVO
    { provide: TokenSignerPort, useClass: JwtTokenService },
  ],
  exports: [
    JwtModule, // por si otros módulos necesitan JwtService
    PassportModule,
    { provide: TokenSignerPort, useClass: JwtTokenService },
  ],
})
export class AuthModule {}
