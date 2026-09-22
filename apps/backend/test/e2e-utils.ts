import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

// Mock SMS provider (SMS_MODE=mock, apps/backend/.env) doim shu kodni yuboradi (OTP_LENGTH=6).
export const MOCK_OTP_CODE = '123456';

export async function createTestApp(): Promise<{ app: INestApplication<App>; prisma: PrismaService }> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  // Swagger hujjatini generatsiya qilish shart emas — har test ilovasini sekinlashtirardi.
  configureApp(app, { swagger: false });
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

interface AuthedUser {
  token: string;
  userId: string;
}

// Haqiqiy OTP oqimi orqali (mock kod bilan) foydalanuvchi yaratadi/kiritadi va tokenini qaytaradi.
export async function otpLogin(app: INestApplication<App>, phone: string): Promise<AuthedUser> {
  await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone }).expect(201);

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/verify-otp')
    .send({ phone, code: MOCK_OTP_CODE })
    .expect(201);

  return { token: response.body.data.token as string, userId: response.body.data.user.id as string };
}

export function authHeader(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

// Har bir e2e fayl/blok o'ziga xos 2 xonali `tag` ishlatadi (masalan '01', '02', ...) — turli
// fayllar bir-birining foydalanuvchisiga aralashib ketmasligi va tozalashni osonlashtirish uchun.
// Natija har doim to'g'ri O'zbekiston raqami: +998 90 + tag(2) + ketma-ketlik(5) = 9 xona.
export function testPhone(tag: string, n: number): string {
  return `+99890${tag}${String(n).padStart(5, '0')}`;
}

// Bitta e2e blok ishlatadigan barcha test raqamlarini bitta so'rovda tozalash uchun.
export function testPhonePrefix(tag: string): string {
  return `+99890${tag}`;
}
