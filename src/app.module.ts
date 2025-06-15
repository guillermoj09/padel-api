import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres123',
      database: 'agenda_bd',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true, // 👈 ¡Esto es clave!
      synchronize: true,
    }),
    EventsModule, // 👈 Esto ya incluye controllers y providers
  ],
})
export class AppModule {}
