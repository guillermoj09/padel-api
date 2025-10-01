import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser'; // (TS común)

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser()); // <-- habilita req.cookies
  /*app.use((req: any, _res, next) => {
    console.log('Cookie header:', req.headers.cookie);
    console.log('Parsed cookies:', req.cookies);
    next();
  });*/
  // Habilitar CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true, // permite cookies cross-site
  });
  const port = 3002;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);

  // main.ts (después de app.use(cookieParser()))
}
bootstrap();
