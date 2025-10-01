import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './events/bookings.module';
import { WebhookModule } from './whatsapp/webhook.module';
import { ConfigModule } from '@nestjs/config';
import { CourtsModule } from './courts/courts.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ConfigModule.forRoot({
      isGlobal: true, // disponible en toda la app
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres123',
      database: 'agenda_bd',
      entities: [__dirname + '/**/*.schema{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    EventsModule,
    WebhookModule,
    CourtsModule,
  ],
})
export class AppModule {}
