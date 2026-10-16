import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { authHeader, createMasterProfile, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

// Har bir e2e fayli o'zining unikal 2 xonali tag'idan foydalanadi — parallel testlar
// bir-birining DB yozuvlarini buzmasligi va afterAll faqat o'zinikini tozalashi uchun.
const TAG = '93';

describe('Admin e2e', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let clientToken: string;
  let masterUserId: string;
  let masterProfileId: string;
  let regionId: string;
  let districtId: string;
  let categoryId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    
    const region = await prisma.region.create({
      data: { nameUz: 'E2E admin viloyati', nameRu: 'E2E admin region' },
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
    masterProfileId = await createMasterProfile(prisma, master.userId, { regionId, districtId, categoryId });
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
    it("barcha ustalar ro'yxatiga ADMIN bo'lmagan (CLIENT) foydalanuvchi kira olmaydi (403)", async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/masters')
        .set(...authHeader(clientToken))
        .expect(403);
    });

    it("yaroqsiz regionId yuborilganda 400 qaytaradi", async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/masters?regionId=not-a-uuid')
        .set(...authHeader(adminToken))
        .expect(400);
    });

    it("kutilayotganlar ro'yxatida ko'rinadi va tasdiqlagach ro'yxatdan chiqadi", async () => {
      const pending = await request(app.getHttpServer())
        .get('/api/v1/admin/masters/pending')
        .set(...authHeader(adminToken))
        .expect(200);
      expect(pending.body.data.items.map((m: { id: string }) => m.id)).toContain(masterProfileId);

      // Tasdiqlanmagan holatda GET /admin/masters?isVerified=false ro'yxatida bo'lishi kerak
      const unverifiedBefore = await request(app.getHttpServer())
        .get(`/api/v1/admin/masters?isVerified=false&regionId=${regionId}`)
        .set(...authHeader(adminToken))
        .expect(200);
      expect(unverifiedBefore.body.data.items.map((m: { id: string }) => m.id)).toContain(masterProfileId);

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

      // Tasdiqlangandan so'ng GET /admin/masters?isVerified=true da stats maydonlari bilan ko'rinadi
      const verifiedList = await request(app.getHttpServer())
        .get(`/api/v1/admin/masters?isVerified=true&regionId=${regionId}`)
        .set(...authHeader(adminToken))
        .expect(200);

      const found = verifiedList.body.data.items.find((m: { id: string }) => m.id === masterProfileId);
      expect(found).toBeDefined();
      expect(found.isVerified).toBe(true);
      expect(found).toHaveProperty('rating');
      expect(found).toHaveProperty('reviewCount');
      expect(found).toHaveProperty('completedOrdersCount');
      expect(found).toHaveProperty('isAvailable');

      // isVerified=false da endi chiqmaydi
      const unverifiedAfter = await request(app.getHttpServer())
        .get(`/api/v1/admin/masters?isVerified=false&regionId=${regionId}`)
        .set(...authHeader(adminToken))
        .expect(200);
      expect(unverifiedAfter.body.data.items.map((m: { id: string }) => m.id)).not.toContain(masterProfileId);
    });
  });

  describe('usta tafsiloti (GET /admin/masters/:id)', () => {
    it("portfolio, xizmatlar va ish vaqti bilan qaytaradi; CLIENT 403, yo'q usta 404, UUID emas 400", async () => {
      await prisma.masterService.create({ data: { masterId: masterProfileId, title: 'E2E xizmat', price: 1000 } });
      await prisma.portfolioImage.create({ data: { masterId: masterProfileId, url: 'https://example.com/e2e.jpg' } });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/masters/${masterProfileId}`)
        .set(...authHeader(adminToken))
        .expect(200);
      expect(res.body.data).toMatchObject({
        id: masterProfileId,
        services: [expect.objectContaining({ title: 'E2E xizmat', price: 1000 })],
        portfolioImages: ['https://example.com/e2e.jpg'],
        workingHours: expect.objectContaining({ start: expect.any(String) }),
        userCreatedAt: expect.any(String),
      });

      await request(app.getHttpServer())
        .get(`/api/v1/admin/masters/${masterProfileId}`)
        .set(...authHeader(clientToken))
        .expect(403);
      await request(app.getHttpServer())
        .get('/api/v1/admin/masters/00000000-0000-4000-8000-000000000000')
        .set(...authHeader(adminToken))
        .expect(404);
      await request(app.getHttpServer())
        .get('/api/v1/admin/masters/not-a-uuid')
        .set(...authHeader(adminToken))
        .expect(400);
    });
  });

  describe("usta qo'shish (POST /admin/masters)", () => {
    const body = (phone: string) => ({
      phone,
      firstName: 'Admin',
      lastName: "Qo'shgan",
      bio: 'E2E: admin tomonidan qo`shilgan usta',
      regionId,
      districtId,
      address: 'Test manzil',
      categoryIds: [categoryId],
      workingHours: { start: '09:00', end: '18:00', workDays: ['mon', 'tue'] },
    });

    it("ADMIN bo'lmagan foydalanuvchi qo'sha olmaydi (403)", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(clientToken))
        .send(body(testPhone(TAG, 20)))
        .expect(403);
    });

    it("majburiy maydonsiz yoki noto'g'ri telefon bilan 400 va akkaunt yaratilmaydi", async () => {
      const phone = testPhone(TAG, 21);
      const { bio: _bio, ...withoutBio } = body(phone);
      await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        .send(withoutBio)
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        .send(body('12345'))
        .expect(400);

      expect(await prisma.user.findUnique({ where: { phone } })).toBeNull();
    });

    it("yangi raqam uchun akkaunt + tasdiqlangan profil yaratadi; shu raqamga qayta qo'shib bo'lmaydi (409)", async () => {
      const phone = testPhone(TAG, 22);
      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        // Panel probelli format yuborishi mumkin — backend normallashtiradi.
        .send(body(`+998 90 ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`))
        .expect(201);

      expect(created.body.data).toMatchObject({
        phone,
        fullName: "Admin Qo'shgan",
        isVerified: true,
        isBlocked: false,
        region: { id: regionId },
        district: { id: districtId },
        categories: [{ id: categoryId }],
        rating: 0,
        isAvailable: true,
      });

      const user = await prisma.user.findUniqueOrThrow({ where: { phone } });
      expect(user).toMatchObject({ role: 'MASTER', name: "Admin Qo'shgan", isPhoneVerified: false });

      // Usta keyin shu raqam bilan OTP orqali kiradi (verify-otp telefon bo'yicha shu akkauntni topadi) —
      // profil aynan shu akkauntga tegishli bo'lishi kerak. Bu yerda `otpLogin` ishlatilmaydi: send-otp
      // IP bo'yicha 5/daq bilan cheklangan va bu fayl limitni to'liq sarflaydi.
      expect(created.body.data.userId).toBe(user.id);

      // Shu raqamga ikkinchi marta qo'shib bo'lmaydi.
      await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        .send(body(phone))
        .expect(409);
    });

    it("mavjud mijozga profil biriktiradi (rol MASTER bo'ladi); isVerified=false kutilayotganlar ro'yxatiga tushadi", async () => {
      const phone = testPhone(TAG, 23);
      const client = await prisma.user.create({ data: { phone, name: 'E2E mijoz', isPhoneVerified: true } });

      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        .send({ ...body(phone), isVerified: false })
        .expect(201);
      expect(created.body.data).toMatchObject({ userId: client.id, isVerified: false });

      const user = await prisma.user.findUniqueOrThrow({ where: { id: client.id } });
      expect(user.role).toBe('MASTER');

      const pending = await request(app.getHttpServer())
        .get('/api/v1/admin/masters/pending?limit=100')
        .set(...authHeader(adminToken))
        .expect(200);
      expect(pending.body.data.items.map((m: { id: string }) => m.id)).toContain(created.body.data.id);
    });

    it("administrator raqamini rad etadi (400), tuman boshqa viloyatda bo'lsa 400 va akkaunt qolmaydi", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/masters')
        .set(...authHeader(adminToken))
        .send(body(testPhone(TAG, 1)))
        .expect(400);

      const phone = testPhone(TAG, 24);
      const otherRegion = await prisma.region.create({ data: { nameUz: 'E2E boshqa viloyat', nameRu: 'E2E другая область' } });
      try {
        await request(app.getHttpServer())
          .post('/api/v1/admin/masters')
          .set(...authHeader(adminToken))
          .send({ ...body(phone), regionId: otherRegion.id })
          .expect(400);
      } finally {
        await prisma.region.delete({ where: { id: otherRegion.id } });
      }
      expect(await prisma.user.findUnique({ where: { phone } })).toBeNull();
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
