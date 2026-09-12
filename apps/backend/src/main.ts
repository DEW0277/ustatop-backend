import { NestFactory, Reflector } from '@nestjs/core';
import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('UstaTop API')
    .setDescription('UstaTop mobil ilova va admin panel uchun backend REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Hech qanday controller mos kelmagan yo'llar ham standart JSON error formatida qaytsin.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundException(`${req.method} ${req.originalUrl} topilmadi`));
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`UstaTop backend http://localhost:${port}/api/v1, Swagger: /api/docs`);
}

await bootstrap();
