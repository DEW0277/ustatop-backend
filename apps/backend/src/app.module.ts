import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SharedAuthModule } from './common/auth/shared-auth.module.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { DistrictsModule } from './modules/districts/districts.module.js';
import { MastersModule } from './modules/masters/masters.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { RegionsModule } from './modules/regions/regions.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { UploadModule } from './modules/upload/upload.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    SharedAuthModule,
    AuthModule,
    AdminModule,
    RegionsModule,
    DistrictsModule,
    CategoriesModule,
    MastersModule,
    OrdersModule,
    ReviewsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // `ThrottlerModule.forRoot` faqat konfiguratsiya beradi — guard sifatida ro'yxatdan
    // o'tkazilmasa hech qanday endpoint haqiqatda cheklanmaydi. Global qo'llash uchun shu shart.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
