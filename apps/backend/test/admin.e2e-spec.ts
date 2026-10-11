import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '05';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let adminToken: string;
  let adminUserId: string;
  let clientToken: string;
  let masterProfileId: string;
  let masterUserId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    const region = await prisma.region.create({
      data: { nameUz: 'E2E admin viloyati', nameRu: 'E2E admin region', code: `E2E-${TAG}` },
    });
    regionId = region.id;
    const district = await prisma.district.create({
      data: { nameUz: 'E2E admin tumani', nameRu: 'E2E admin district', regionId },
    });
    districtId = district.id;
    const category = await prisma.category.create({
      data: { nameUz: 'E2E admin kategoriya', nameRu: 'E2E admin category', icon: 'test', description: 'test', slug: `e2e-admin-${TAG}` },
    });
    categoryId = category.id;

    const admin = await otpLogin(app, testPhone(TAG, 1));
    adminToken = admin.token;
    adminUserId = admin.userId;
    // ADMIN roli faqat DB orqali (yoki `ADMIN_PHONE` seed'i bilan) beriladi — ochiq endpoint yo'q.
    // Token allaqachon rolni emas, faqat userId'ni saqlaydi (`sub`), shuning uchun eski token ham
    // rol o'zgargandan keyin ishlashda davom etadi (rol har so'rovda DB'dan o'qiladi).
    await prisma.user.update({ where: { id: adminUserId }, data: { role: 'ADMIN' } });

    clientToken = (await otpLogin(app, testPhone(TAG, 2))).token;

    const master = await otpLogin(app, testPhone(TAG, 3));
    masterUserId = master.userId;
    const profile = await request(app.getHttpServer())
      .put('/api/v1/masters/me/profile')
      .set(...authHeader(master.token))
      .send({
        firstName: 'Kutilayotgan',
        lastName: 'Usta',
        bio: 'E2E admin test uchun usta profili',
        experienceYears: 1,
        regionId,
        districtId,
        address: 'Test manzil',
        categoryIds: [categoryId],
        workingHours: { start: '09:00', end: '18:00', workDays: ['mon'] },
      })
      .expect(200);
    masterProfileId = profile.body.data.id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { masterId: masterProfileId } });
    await prisma.order.deleteMany({ where: { masterId: masterProfileId } });
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('RolesGuard', () => {
    it('tokensiz 401 qaytaradi', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
    });

    it('CLIENT roli uchun 403 qaytaradi', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set(...authHeader(clientToken))
        .expect(403);
    });

    it('ADMIN roli uchun 200 qaytaradi', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set(...authHeader(adminToken))
        .expect(200);
    });
  });

  describe('users', () => {
    it("o'zini bloklab bo'lmaydi", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${adminUserId}/block`)
        .set(...authHeader(adminToken))
        .send({ isBlocked: true })
        .expect(400);
      expect(res.body.message).toMatch(/o'zingizni/i);
    });

    it("boshqa foydalanuvchini bloklaydi va bloklangan foydalanuvchi darhol 401 oladi", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${masterUserId}/block`)
        .set(...authHeader(adminToken))
        .send({ isBlocked: true })
        .expect(200);

      // Bloklangan foydalanuvchi baribir OTP orqali kira oladi (verify-otp blokni tekshirmaydi,
      // token beradi) — lekin shu tokenning o'zi keyingi so'rovda darhol rad etiladi (JwtStrategy).
      const master = await otpLogin(app, testPhone(TAG, 3));
      await request(app.getHttpServer()).get('/api/v1/auth/me').set(...authHeader(master.token)).expect(401);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${masterUserId}/block`)
        .set(...authHeader(adminToken))
        .send({ isBlocked: false })
        .expect(200);
    });
  });

  describe('masters', () => {
    it("kutilayotganlar ro'yxatida ko'rinadi va tasdiqlagach ro'yxatdan chiqadi", async () => {
      const pending = await request(app.getHttpServer())
        .get('/api/v1/admin/masters/pending')
        .set(...authHeader(adminToken))
        .expect(200);
      expect(pending.body.data.items.map((m: { id: string }) => m.id)).toContain(masterProfileId);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/masters/${masterProfileId}/verify`)
        .set(...authHeader(adminToken))
        .send({})
        .expect(200)
        .expect((res) => expect(res.body.data).toEqual({ id: masterProfileId, isVerified: true }));

      const pendingAfter = await request(app.getHttpServer())
        .get('/api/v1/admin/masters/pending')
        .set(...authHeader(adminToken))
        .expect(200);
      expect(pendingAfter.body.data.items.map((m: { id: string }) => m.id)).not.toContain(masterProfileId);
    });
  });

  describe('reviews', () => {
    it("sharhni o'chiradi va usta reytingini qayta hisoblaydi", async () => {
      const client = await otpLogin(app, testPhone(TAG, 2));
      const reviewBody = { rating: 2, comment: "E2E test sharhi — o'chiriladi" };

      // Tugallangan buyurtmasiz sharh qoldirib bo'lmaydi; `pending` buyurtma ham yetarli emas.
      const order = await prisma.order.create({
        data: {
          masterId: masterProfileId,
          clientId: client.userId,
          serviceTitle: 'E2E xizmat',
          price: 100000,
          clientName: 'E2E mijoz',
          clientPhone: testPhone(TAG, 2),
          districtId,
          address: 'Test manzil',
          preferredDate: 'Bugun',
          preferredTime: '12:00 - 15:00',
        },
      });
      const forbidden = await request(app.getHttpServer())
        .post(`/api/v1/masters/${masterProfileId}/reviews`)
        .set(...authHeader(client.token))
        .send(reviewBody)
        .expect(403);
      expect(forbidden.body.success).toBe(false);
      await prisma.order.update({ where: { id: order.id }, data: { status: 'completed' } });

      const review = await request(app.getHttpServer())
        .post(`/api/v1/masters/${masterProfileId}/reviews`)
        .set(...authHeader(client.token))
        .send({ rating: 2, comment: "E2E test sharhi — o'chiriladi" })
        .expect(201);

      const masterBefore = await request(app.getHttpServer()).get(`/api/v1/masters/${masterProfileId}`).expect(200);
      expect(masterBefore.body.data.reviewCount).toBe(1);
      expect(masterBefore.body.data.rating).toBe(2);

      await request(app.getHttpServer()).get('/api/v1/admin/reviews').expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/admin/reviews')
        .set(...authHeader(clientToken))
        .expect(403);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/reviews?masterId=${masterProfileId}&rating=2`)
        .set(...authHeader(adminToken))
        .expect(200);

      expect(listRes.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: review.body.data.id,
            masterId: masterProfileId,
            rating: 2,
            comment: "E2E test sharhi — o'chiriladi",
          }),
        ]),
      );
      expect(listRes.body.data.total).toBeGreaterThanOrEqual(1);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/reviews/${review.body.data.id}`)
        .set(...authHeader(clientToken))
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/reviews/${review.body.data.id}`)
        .set(...authHeader(adminToken))
        .expect(200);

      const masterAfter = await request(app.getHttpServer()).get(`/api/v1/masters/${masterProfileId}`).expect(200);
      expect(masterAfter.body.data.reviewCount).toBe(0);
      expect(masterAfter.body.data.rating).toBe(0);
    });
  });
});
