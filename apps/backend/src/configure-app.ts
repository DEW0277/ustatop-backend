import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory.js';

export interface ConfigureAppOptions {
  // e2e testlarda Swagger hujjatini generatsiya qilish shart emas — har test ilovasini tezroq qiladi.
  swagger?: boolean;
}

// `main.ts` va e2e test setup bootstrap konfiguratsiyasini bu yerdan oladi — ikkalasi bir xil
// pipe/filter/interceptor bilan ishlashi kerak, aks holda testlar production xatti-harakatini aks ettirmaydi.
export function configureApp(app: INestApplication, options: ConfigureAppOptions = {}): void {
  const { swagger = true } = options;

  // Swagger UI o'ziga xos inline script/style'larga tayanadi — qattiq CSP uni sindirib qo'yadi.
  // Bu API HTML render qilmaydi (faqat JSON + Swagger sahifasi), shuning uchun CSP xavfi past;
  // boshqa sarlavhalar (HSTS, X-Content-Type-Options, X-Frame-Options, ...) baribir yoqiladi.
  app.use(helmet({ contentSecurityPolicy: false }));

  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';

  // Mobil ilova va server-to-server chaqiruvlarga (masalan admin panel proksisi) bu ta'sir qilmaydi —
  // CORS faqat brauzerning cross-origin so'rovini cheklaydi. Prod'da `CORS_ORIGINS` ko'rsatilmasa,
  // xavfsiz standart sifatida barcha cross-origin brauzer so'rovlari bloklanadi.
  app.enableCors({ origin: configuredOrigins.length > 0 ? configuredOrigins : !isProduction });

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

  if (swagger) {
    const config = new DocumentBuilder()
      .setTitle('UstaTop API')
      .setDescription('UstaTop mobil ilova va admin panel uchun backend REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}
