import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeader, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '01';

describe('Auth (e2e)', () => {
  // Har bir testga o'z ilova nusxasi: `/auth/*` IP bo'yicha throttle qilinadi (5/daq, xotirada
  // saqlanadi), bitta ilovani baham ko'rsak testlar tartibiga qarab bir-birining limitini
  // "yeb qo'yib", beqaror natija berardi.
  let app: INestApplication<App>;
  const cleanup = new PrismaClient();

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await cleanup.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await cleanup.$disconnect();
  });

  it("to'g'ri OTP bilan yangi foydalanuvchi yaratadi va /auth/me sessiyani qaytaradi", async () => {
    const phone = testPhone(TAG, 1);

    const { token } = await otpLogin(app, phone);

    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set(...authHeader(token)).expect(200);

    expect(me.body.data).toMatchObject({ phone, role: 'client', name: 'Foydalanuvchi' });
    expect(me.body.data).not.toHaveProperty('avatarUrl');
  });

  it("noto'g'ri kod 400 qaytaradi va foydalanuvchi yaratilmaydi", async () => {
    const phone = testPhone(TAG, 2);
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone }).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone, code: '000000' })
      .expect(400);

    expect(await cleanup.user.findUnique({ where: { phone } })).toBeNull();
  });

  it("5-urinishda kodni bekor qiladi (bruteforce himoyasi) — bir vaqtda /auth/verify-otp'ning o'zi ham 5/daq bilan throttle qilingani uchun bu ikkalasi bitta so'rov byudjetiga sig'adi", async () => {
    const phone = testPhone(TAG, 3);
    await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone }).expect(201);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone, code: '000000' })
        .expect(400);
      expect(res.body.message).toBe("Kod noto'g'ri");
    }

    const locked = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone, code: '000000' })
      .expect(400);
    expect(locked.body.message).toMatch(/Urinishlar soni oshib ketdi/);
    // Kod shu bilan bekor qilingani (`redis.del(key)`) `auth.service.spec.ts`da unit darajasida
    // tekshirilgan; shu IP uchun /auth/verify-otp byudjeti ham (5/daq) shu yerda tugagani sababli,
    // "endi to'g'ri kod bilan ham kirib bo'lmaydi"ni bir xil so'rovda HTTP orqali tekshirib
    // bo'lmaydi (6-chaqiruv throttle'ning o'zida 429 bilan to'xtaydi — bu ham kutilgan xatti-harakat).
  });

  it("bloklangan foydalanuvchining mavjud tokeni keyingi so'rovda 401 oladi", async () => {
    const phone = testPhone(TAG, 4);
    const { token, userId } = await otpLogin(app, phone);

    await cleanup.user.update({ where: { id: userId }, data: { isBlocked: true } });

    await request(app.getHttpServer()).get('/api/v1/auth/me').set(...authHeader(token)).expect(401);
  });
});

describe('Auth throttle (e2e)', () => {
  const THROTTLE_TAG = '02';
  let app: INestApplication<App>;
  const cleanup = new PrismaClient();

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await cleanup.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(THROTTLE_TAG) } } });
    await cleanup.$disconnect();
  });

  it("bir daqiqada 5 tadan ortiq /auth/send-otp so'rovini 429 bilan to'xtatadi", async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: testPhone(THROTTLE_TAG, i) })
        .expect(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: testPhone(THROTTLE_TAG, 5) })
      .expect(429);

    expect(blocked.body.message).toMatch(/juda ko'p/);
  });

  it("fcm-token: saqlaydi, boshqa akkauntga o'tganda eskisidan olib tashlaydi, DELETE tozalaydi", async () => {
    const first = await otpLogin(app, testPhone(TAG, 50));
    const second = await otpLogin(app, testPhone(TAG, 51));
    const server = app.getHttpServer();
    const fcmToken = `e2e-device-token-${TAG}`;
    const tokenOf = async (id: string) =>
      (await cleanup.user.findUniqueOrThrow({ where: { id }, select: { fcmToken: true } })).fcmToken;

    await request(server).put('/api/v1/auth/fcm-token').send({ fcmToken }).expect(401);
    await request(server).put('/api/v1/auth/fcm-token').set(...authHeader(first.token)).send({}).expect(400);
    await request(server)
      .put('/api/v1/auth/fcm-token')
      .set(...authHeader(first.token))
      .send({ fcmToken, userId: second.userId })
      .expect(400);

    const registered = await request(server)
      .put('/api/v1/auth/fcm-token')
      .set(...authHeader(first.token))
      .send({ fcmToken })
      .expect(200);
    expect(registered.body.data).toEqual({ registered: true });
    expect(await tokenOf(first.userId)).toBe(fcmToken);

    // Shu qurilmada ikkinchi akkaunt bilan kirildi — token ko'chadi.
    await request(server).put('/api/v1/auth/fcm-token').set(...authHeader(second.token)).send({ fcmToken }).expect(200);
    expect(await tokenOf(first.userId)).toBeNull();
    expect(await tokenOf(second.userId)).toBe(fcmToken);

    const removed = await request(server).delete('/api/v1/auth/fcm-token').set(...authHeader(second.token)).expect(200);
    expect(removed.body.data).toEqual({ registered: false });
    expect(await tokenOf(second.userId)).toBeNull();
  });

  it("TRUST_PROXY=1: rate limit proxy ortidagi haqiqiy mijoz IP'si bo'yicha hisoblanadi", async () => {
    await app.close();
    process.env.TRUST_PROXY = '1';
    try {
      ({ app } = await createTestApp());
    } finally {
      delete process.env.TRUST_PROXY;
    }
    const sendOtp = (ip: string, n: number) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .set('X-Forwarded-For', ip)
        .send({ phone: testPhone(TAG, n) });

    for (let n = 60; n < 65; n += 1) {
      await sendOtp('203.0.113.10', n).expect(201);
    }
    await sendOtp('203.0.113.10', 65).expect(429);
    // Boshqa mijoz birinchisining limitiga tushib qolmaydi.
    await sendOtp('203.0.113.20', 66).expect(201);
  });

  it("TRUST_PROXY'siz X-Forwarded-For e'tiborga olinmaydi (sarlavhani almashtirib limitdan qochib bo'lmaydi)", async () => {
    for (let n = 70; n < 75; n += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .set('X-Forwarded-For', `198.51.100.${n}`)
        .send({ phone: testPhone(TAG, n) })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .set('X-Forwarded-For', '198.51.100.99')
      .send({ phone: testPhone(TAG, 75) })
      .expect(429);
  });
});
