import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '04';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let masterProfileId: string;
  let masterToken: string;
  let clientToken: string;
  let strangerToken: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    // Buyurtma/usta profili uchun minimal fixture — real seed ma'lumotiga tegmaslik uchun
    // o'ziga xos (test bilan bog'liqligi bilinib turadigan) nom/kod bilan.
    const region = await prisma.region.create({
      data: { nameUz: 'E2E test viloyati', nameRu: 'E2E test region', code: `E2E-${TAG}` },
    });
    regionId = region.id;
    const district = await prisma.district.create({
      data: { nameUz: 'E2E test tumani', nameRu: 'E2E test district', regionId },
    });
    districtId = district.id;
    const category = await prisma.category.create({
      data: { nameUz: 'E2E test kategoriya', nameRu: 'E2E test category', icon: 'test', description: 'test', slug: `e2e-test-${TAG}` },
    });
    categoryId = category.id;

    const master = await otpLogin(app, testPhone(TAG, 1));
    masterToken = master.token;
    clientToken = (await otpLogin(app, testPhone(TAG, 2))).token;
    strangerToken = (await otpLogin(app, testPhone(TAG, 3))).token;

    const profile = await request(app.getHttpServer())
      .put('/api/v1/masters/me/profile')
      .set(...authHeader(masterToken))
      .send({
        firstName: 'Test',
        lastName: 'Usta',
        bio: 'E2E test uchun usta profili',
        experienceYears: 2,
        regionId,
        districtId,
        address: 'Test manzil 1',
        categoryIds: [categoryId],
        workingHours: { start: '09:00', end: '18:00', workDays: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      })
      .expect(200);
    masterProfileId = profile.body.data.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { masterId: masterProfileId } });
    await prisma.review.deleteMany({ where: { masterId: masterProfileId } });
    // User o'chirilsa MasterProfile (categories/services/portfolio bilan) cascade o'chadi.
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  function createOrderPayload(overrides: Record<string, unknown> = {}) {
    return {
      masterId: masterProfileId,
      serviceTitle: 'Rozetka ornatish',
      price: 50000,
      clientName: 'Test Mijoz',
      clientPhone: testPhone(TAG, 2),
      districtId,
      address: 'Mijoz manzili',
      preferredDate: 'Bugun',
      preferredTime: '12:00 - 15:00',
      ...overrides,
    };
  }

  it("mijoz buyurtma yaratadi, usta uni ko'radi va bajaradi (to'liq lifecycle)", async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(...authHeader(clientToken))
      .send(createOrderPayload())
      .expect(201);

    const orderId = created.body.data.id;
    expect(created.body.data).toMatchObject({ status: 'pending', masterId: masterProfileId });

    const masterInbox = await request(app.getHttpServer())
      .get('/api/v1/orders/my')
      .set(...authHeader(masterToken))
      .expect(200);
    expect(masterInbox.body.data.map((o: { id: string }) => o.id)).toContain(orderId);

    // Begona foydalanuvchi buyurtmani o'zgartira olmaydi (mavjudligini ham bilmasligi kerak — 404).
    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(strangerToken))
      .send({ status: 'in_progress' })
      .expect(404);

    // Ruxsat etilmagan o'tish: pending -> completed to'g'ridan-to'g'ri bo'lmaydi.
    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(masterToken))
      .send({ status: 'completed' })
      .expect(400);

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(masterToken))
      .send({ status: 'in_progress' })
      .expect(200)
      .expect((res) => expect(res.body.data).toEqual({ orderId, status: 'in_progress' }));

    const before = await request(app.getHttpServer()).get(`/api/v1/masters/${masterProfileId}`).expect(200);
    const completedBefore = before.body.data.completedOrdersCount;

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(masterToken))
      .send({ status: 'completed' })
      .expect(200);

    const after = await request(app.getHttpServer()).get(`/api/v1/masters/${masterProfileId}`).expect(200);
    expect(after.body.data.completedOrdersCount).toBe(completedBefore + 1);

    // Yakunlangan buyurtmadan keyin ham status o'zgartirib bo'lmaydi (yakuniy holat).
    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(masterToken))
      .send({ status: 'cancelled' })
      .expect(400);
  });

  it("band bo'lmagan ustaga (isAvailable=false) buyurtma berib bo'lmaydi", async () => {
    await prisma.masterProfile.update({ where: { id: masterProfileId }, data: { isAvailable: false } });

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(...authHeader(clientToken))
      .send(createOrderPayload())
      .expect(400);

    await prisma.masterProfile.update({ where: { id: masterProfileId }, data: { isAvailable: true } });
  });

  it("usta o'ziga (o'z profiliga) buyurtma bera olmaydi", async () => {
    // Tekshiruv chaqiruvchi foydalanuvchi ID'siga qarab ishlaydi, `clientPhone`ga emas.
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(...authHeader(masterToken))
      .send(createOrderPayload())
      .expect(400);
  });

  it("mijoz o'z bergan (pending) buyurtmasini bekor qila oladi, lekin usta qabul qilganidan keyin bekor qila olmaydi", async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(...authHeader(clientToken))
      .send(createOrderPayload())
      .expect(201);
    const orderId = created.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${orderId}/status`)
      .set(...authHeader(clientToken))
      .send({ status: 'cancelled' })
      .expect(200);

    const secondOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(...authHeader(clientToken))
      .send(createOrderPayload())
      .expect(201);
    const secondId = secondOrder.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${secondId}/status`)
      .set(...authHeader(masterToken))
      .send({ status: 'in_progress' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/orders/${secondId}/status`)
      .set(...authHeader(clientToken))
      .send({ status: 'cancelled' })
      .expect(400);
  });
});
