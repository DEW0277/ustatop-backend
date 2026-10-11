import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { assertProductionConfig } from './common/config/production-guard.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  // `import 'dotenv'` emas: production'da qiymatlar konteyner muhitidan keladi (compose `env_file`),
  // dev'da esa NODE_ENV production emas — tekshiruv o'tkazib yuboriladi.
  assertProductionConfig();

  const app = await NestFactory.create(AppModule);
  // Swagger production'da standart yopiq (API tuzilishini ochiq e'lon qilmaslik uchun);
  // kerak bo'lsa SWAGGER_ENABLED=true bilan yoqiladi.
  configureApp(app, {
    swagger: process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`UstaTop backend http://localhost:${port}/api/v1, Swagger: /api/docs`);
}

await bootstrap();
