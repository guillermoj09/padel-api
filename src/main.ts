import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use(cookieParser());

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: [
      frontendUrl,
      'https://profejoshua.cl',
      'https://www.profejoshua.cl',
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT || 3002);

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server is running on port ${port}`);
}

bootstrap();
