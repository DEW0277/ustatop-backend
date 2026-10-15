import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, createMasterProfile, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '06';

describe('Reviews (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let masterId: string;
  let masterToken: string;
  let clientA: { token: string; userId: string };
  let clientB: { token: string; userId: string };
  let clientC: { token: string; userId: string };

  async function completedOrder(clientId: string, n: number, status: 'completed' | 'pending' = 'completed') {
    await prisma.order.create({
      data: {
        masterId,
        clientId,
        serviceTitle: 'E2E xizmat',
        price: 100000,
        clientName: 'E2E mijoz',
        clientPhone: testPhone(TAG, n),
        districtId,
        address: 'Test manzil',
        preferredDate: 'Bugun',
        preferredTime: '12:00 - 15:00',
        status,
      },
    });
  }

  function review(token: string, body: { rating: number; comment: string }) {
    return request(app.getHttpServer()).post(`/api/v1/masters/${masterId}/reviews`).set(...authHeader(token)).send(body);
  }

  beforeAll(async () => {
    ({ app } = await createTestApp());

    regionId = (
      await prisma.region.create({ data: { nameUz: 'E2E reviews viloyati', nameRu: 'E2E', code: `E2E-${TAG}` } })
    ).id;
    districtId = (await prisma.district.create({ data: { nameUz: 'E2E reviews tumani', nameRu: 'E2E', regionId } })).id;
    categoryId = (
      await prisma.category.create({
        data: { nameUz: 'E2E reviews kategoriya', nameRu: 'E2E', icon: 'test', description: 'test', slug: `e2e-reviews-${TAG}` },
      })
    ).id;

    const master = await otpLogin(app, testPhone(TAG, 1));
    masterToken = master.token;
    masterId = await createMasterProfile(prisma, master.userId, { regionId, districtId, categoryId });

    clientA = await otpLogin(app, testPhone(TAG, 2));
    clientB = await otpLogin(app, testPhone(TAG, 3));
    clientC = await otpLogin(app, testPhone(TAG, 4));
    await completedOrder(clientA.userId, 2);
    await completedOrder(clientB.userId, 3, 'pending');
    await completedOrder(clientC.userId, 4);
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { masterId } });
    await prisma.order.deleteMany({ where: { masterId } });
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  it("tokensiz 401; faqat `pending` buyurtmasi bor mijoz 403; usta o'ziga 400", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/masters/${masterId}/reviews`)
      .send({ rating: 5, comment: 'Zo`r usta' })
      .expect(401);
    await review(clientB.token, { rating: 5, comment: 'Hali tugamagan ish' }).expect(403);
    await review(masterToken, { rating: 5, comment: "O'zimga besh" }).expect(400);

    expect(await prisma.review.count({ where: { masterId } })).toBe(0);
  });

  it("noto'g'ri baho (0, 6, kasr) va qisqa izoh 400; yo'q usta 404", async () => {
    for (const rating of [0, 6, 4.5]) {
      await review(clientA.token, { rating, comment: 'Yaxshi ish' }).expect(400);
    }
    await review(clientA.token, { rating: 5, comment: 'ok' }).expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/masters/00000000-0000-0000-0000-000000000000/reviews')
      .set(...authHeader(clientA.token))
      .send({ rating: 5, comment: 'Yaxshi ish' })
      .expect(404);
  });

  it("reyting har sharhdan keyin qayta hisoblanadi; qayta yuborilgan sharh yangisini qo'shmaydi, yangilaydi", async () => {
    await review(clientA.token, { rating: 4, comment: 'Yaxshi ishladi' }).expect(201);
    let master = await prisma.masterProfile.findUniqueOrThrow({ where: { id: masterId } });
    expect(master).toMatchObject({ rating: 4, reviewCount: 1 });

    await review(clientA.token, { rating: 2, comment: "Fikrim o'zgardi" }).expect(201);
    master = await prisma.masterProfile.findUniqueOrThrow({ where: { id: masterId } });
    expect(master).toMatchObject({ rating: 2, reviewCount: 1 });

    await review(clientC.token, { rating: 5, comment: 'Juda zo`r' }).expect(201);
    master = await prisma.masterProfile.findUniqueOrThrow({ where: { id: masterId } });
    expect(master).toMatchObject({ rating: 3.5, reviewCount: 2 });
  });

  it("public ro'yxat tekis mobil `Review` shaklida, sahifalanadi; usta sahifasida ham ko'rinadi", async () => {
    const list = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}/reviews`).expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0]).toEqual({
      id: expect.any(String),
      masterId,
      userId: expect.any(String),
      userName: expect.any(String),
      userAvatar: expect.any(String),
      rating: expect.any(Number),
      comment: expect.any(String),
      createdAt: expect.any(String),
    });

    const page = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}/reviews?limit=1&page=2`).expect(200);
    expect(page.body.data).toHaveLength(1);

    const detail = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
    expect(detail.body.data).toMatchObject({ rating: 3.5, reviewCount: 2 });
    expect(detail.body.data.reviews).toHaveLength(2);

    await request(app.getHttpServer()).get('/api/v1/masters/00000000-0000-0000-0000-000000000000/reviews').expect(404);
  });
});
