import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, createMasterProfile, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '07';

describe('Favorites (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let masterId: string;
  let clientToken: string;
  let otherClientToken: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    regionId = (
      await prisma.region.create({ data: { nameUz: 'E2E favorites viloyati', nameRu: 'E2E', code: `E2E-${TAG}` } })
    ).id;
    districtId = (await prisma.district.create({ data: { nameUz: 'E2E favorites tumani', nameRu: 'E2E', regionId } })).id;
    categoryId = (
      await prisma.category.create({
        data: { nameUz: 'E2E favorites kategoriya', nameRu: 'E2E', icon: 'test', description: 'test', slug: `e2e-fav-${TAG}` },
      })
    ).id;

    const master = await otpLogin(app, testPhone(TAG, 1));
    masterId = await createMasterProfile(prisma, master.userId, { regionId, districtId, categoryId });
    clientToken = (await otpLogin(app, testPhone(TAG, 2))).token;
    otherClientToken = (await otpLogin(app, testPhone(TAG, 3))).token;
  });

  afterAll(async () => {
    // FavoriteMaster user/usta o'chirilganda cascade o'chadi.
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('tokensiz 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/favorites').expect(401);
    await request(app.getHttpServer()).post(`/api/v1/favorites/${masterId}`).expect(401);
  });

  it("qo'shish takrorlansa ham bitta yozuv; ro'yxat va ID'lar faqat o'ziniki; o'chirish idempotent", async () => {
    for (let i = 0; i < 2; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/favorites/${masterId}`)
        .set(...authHeader(clientToken))
        .expect(201)
        .expect((res) => expect(res.body.data).toEqual({ masterId, isFavorite: true }));
    }

    const ids = await request(app.getHttpServer()).get('/api/v1/favorites/ids').set(...authHeader(clientToken)).expect(200);
    expect(ids.body.data).toEqual([masterId]);

    const list = await request(app.getHttpServer()).get('/api/v1/favorites').set(...authHeader(clientToken)).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: masterId, fullName: 'Test Usta', categoryIds: [categoryId] });

    // Boshqa mijozning sevimlilari alohida.
    const other = await request(app.getHttpServer())
      .get('/api/v1/favorites/ids')
      .set(...authHeader(otherClientToken))
      .expect(200);
    expect(other.body.data).toEqual([]);

    for (let i = 0; i < 2; i += 1) {
      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${masterId}`)
        .set(...authHeader(clientToken))
        .expect(200)
        .expect((res) => expect(res.body.data).toEqual({ masterId, isFavorite: false }));
    }
    const after = await request(app.getHttpServer()).get('/api/v1/favorites/ids').set(...authHeader(clientToken)).expect(200);
    expect(after.body.data).toEqual([]);
  });

  it("yo'q ustani qo'shib bo'lmaydi (404)", async () => {
    await request(app.getHttpServer())
      .post('/api/v1/favorites/00000000-0000-0000-0000-000000000000')
      .set(...authHeader(clientToken))
      .expect(404);
  });
});
