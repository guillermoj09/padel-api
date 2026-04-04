import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from './events/bookings.module';
import { WebhookModule } from './whatsapp/webhook.module';
import { ConfigModule } from '@nestjs/config';
import { CourtsModule } from './courts/courts.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agenda_bd',
      entities: [__dirname + '/**/*.schema{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),

    AuthModule,
    BookingsModule,
    WebhookModule,
    CourtsModule,
  ],
})
export class AppModule {}
