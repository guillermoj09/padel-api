import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './events/bookings.module';

@Module({
  imports: [
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
    EventsModule,
  ],
})
export class AppModule {}
