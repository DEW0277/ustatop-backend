import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StorageService } from '../src/modules/upload/storage.service.js';
import { authHeader, createMasterProfile, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '05';

describe('Masters (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let otherCategoryId: string;
  let masterId: string;
  let otherMasterId: string;
  let fuelStationId: string;
  let partsShopId: string;
  let masterToken: string;
  let otherMasterToken: string;
  let clientToken: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    const region = await prisma.region.create({
      data: { nameUz: 'E2E masters viloyati', nameRu: 'E2E masters region', code: `E2E-${TAG}` },
    });
    regionId = region.id;
    districtId = (
      await prisma.district.create({ data: { nameUz: 'E2E masters tumani', nameRu: 'E2E masters district', regionId } })
    ).id;
    categoryId = (
      await prisma.category.create({
        data: { nameUz: 'E2E masters kategoriya', nameRu: 'E2E', icon: 'test', description: 'test', slug: `e2e-masters-${TAG}` },
      })
    ).id;
    otherCategoryId = (
      await prisma.category.create({
        data: { nameUz: 'E2E boshqa kategoriya', nameRu: 'E2E', icon: 'test', description: 'test', slug: `e2e-masters-b-${TAG}` },
      })
    ).id;

    const master = await otpLogin(app, testPhone(TAG, 1));
    masterToken = master.token;
    masterId = await createMasterProfile(prisma, master.userId, { regionId, districtId, categoryId });

    const other = await otpLogin(app, testPhone(TAG, 2));
    otherMasterToken = other.token;
    otherMasterId = await createMasterProfile(prisma, other.userId, { regionId, districtId, categoryId: otherCategoryId });

    clientToken = (await otpLogin(app, testPhone(TAG, 3))).token;

    // Shoxobcha va do'kon: OTP orqali kirish shart emas (send-otp limiti) — akkaunt to'g'ridan-to'g'ri bazada.
    const fuelUser = await prisma.user.create({ data: { phone: testPhone(TAG, 4), name: 'E2E shoxobcha' } });
    fuelStationId = await createMasterProfile(prisma, fuelUser.id, { regionId, districtId, categoryId }, 'FUEL_STATION');
    const shopUser = await prisma.user.create({ data: { phone: testPhone(TAG, 5), name: "E2E do'kon" } });
    partsShopId = await createMasterProfile(prisma, shopUser.id, { regionId, districtId, categoryId }, 'PARTS_SHOP');
  });

  afterAll(async () => {
    // User o'chirilsa MasterProfile (xizmatlar, portfolio, kategoriyalar bilan) cascade o'chadi.
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.deleteMany({ where: { id: { in: [categoryId, otherCategoryId] } } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('public: GET /masters, GET /masters/:id', () => {
    it("tuman va kategoriya bo'yicha filtrlaydi", async () => {
      const byDistrict = await request(app.getHttpServer()).get(`/api/v1/masters?districtId=${districtId}`).expect(200);
      expect(byDistrict.body.data.map((m: { id: string }) => m.id).sort()).toEqual([masterId, otherMasterId].sort());

      const byCategory = await request(app.getHttpServer())
        .get(`/api/v1/masters?districtId=${districtId}&categoryId=${otherCategoryId}`)
        .expect(200);
      expect(byCategory.body.data.map((m: { id: string }) => m.id)).toEqual([otherMasterId]);
    });

    it('bloklangan usta ro\'yxatda ham, qidiruvda ham ko\'rinmaydi', async () => {
      await prisma.user.update({ where: { phone: testPhone(TAG, 2) }, data: { isBlocked: true } });
      try {
        const res = await request(app.getHttpServer()).get(`/api/v1/masters?regionId=${regionId}`).expect(200);
        expect(res.body.data.map((m: { id: string }) => m.id)).toEqual([masterId]);
      } finally {
        await prisma.user.update({ where: { phone: testPhone(TAG, 2) }, data: { isBlocked: false } });
      }
    });

    it("noto'g'ri filtrlar 400: UUID bo'lmagan regionId, limit > 100, noma'lum sortBy", async () => {
      await request(app.getHttpServer()).get('/api/v1/masters?regionId=abc').expect(400);
      await request(app.getHttpServer()).get('/api/v1/masters?limit=101').expect(400);
      await request(app.getHttpServer()).get('/api/v1/masters?sortBy=price').expect(400);
    });

    it("usta sahifasi mobil `Master` shaklida; yo'q usta 404", async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
      const master = res.body.data;

      expect(master).toMatchObject({
        id: masterId,
        fullName: 'Test Usta',
        avatarUrl: '',
        regionId,
        districtId,
        categoryIds: [categoryId],
        portfolioImages: [],
        services: [],
        reviews: [],
        isAvailable: true,
      });
      expect(master).not.toHaveProperty('telegram');
      expect(typeof master.createdAt).toBe('string');

      await request(app.getHttpServer()).get('/api/v1/masters/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('usta turi (type)', () => {
    const idsOf = (res: { body: { data: { id: string }[] } }) => res.body.data.map((m) => m.id);

    it("type berilmasa faqat MASTER qaytadi (shu tumandagi shoxobcha va do'kon ko'rinmaydi); elementlarda type bor", async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/masters?districtId=${districtId}`).expect(200);

      expect(idsOf(res).sort()).toEqual([masterId, otherMasterId].sort());
      expect(idsOf(res)).not.toContain(fuelStationId);
      expect(idsOf(res)).not.toContain(partsShopId);
      for (const item of res.body.data) {
        expect(item.type).toBe('MASTER');
      }
    });

    it("type=FUEL_STATION faqat shoxobchalarni, type=PARTS_SHOP faqat do'konlarni qaytaradi", async () => {
      const fuel = await request(app.getHttpServer())
        .get(`/api/v1/masters?districtId=${districtId}&type=FUEL_STATION`)
        .expect(200);
      expect(idsOf(fuel)).toEqual([fuelStationId]);
      expect(fuel.body.data[0].type).toBe('FUEL_STATION');

      const shops = await request(app.getHttpServer())
        .get(`/api/v1/masters?districtId=${districtId}&type=PARTS_SHOP`)
        .expect(200);
      expect(idsOf(shops)).toEqual([partsShopId]);

      const masters = await request(app.getHttpServer()).get(`/api/v1/masters?districtId=${districtId}&type=MASTER`).expect(200);
      expect(idsOf(masters).sort()).toEqual([masterId, otherMasterId].sort());
    });

    it("type boshqa filtrlar bilan AND: kategoriya mos kelmasa bo'sh", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/masters?districtId=${districtId}&type=FUEL_STATION&categoryId=${otherCategoryId}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it("noto'g'ri type 400 (success: false)", async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/masters?type=SHOP').expect(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /masters/:id shoxobcha uchun ham 200 va type bilan', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/masters/${fuelStationId}`).expect(200);
      expect(res.body.data).toMatchObject({ id: fuelStationId, type: 'FUEL_STATION' });
    });

    it("usta o'z turini PUT /masters/me/profile orqali o'zgartira olmaydi (400), tur bazada o'zgarmaydi", async () => {
      await request(app.getHttpServer())
        .put('/api/v1/masters/me/profile')
        .set(...authHeader(masterToken))
        .send({ type: 'FUEL_STATION' })
        .expect(400);

      const profile = await prisma.masterProfile.findUniqueOrThrow({ where: { id: masterId } });
      expect(profile.type).toBe('MASTER');
    });
  });

  describe('xizmatlar (resurs egaligi)', () => {
    it("mijoz xizmat qo'sha olmaydi (403); usta qo'shadi, tahrirlaydi va o'chiradi; boshqa usta tega olmaydi (404)", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/masters/me/services')
        .set(...authHeader(clientToken))
        .send({ title: 'Mijoz xizmati', price: 1000 })
        .expect(403);

      const created = await request(app.getHttpServer())
        .post('/api/v1/masters/me/services')
        .set(...authHeader(masterToken))
        .send({ title: "Rozetka o'rnatish", price: 50000 })
        .expect(201);
      const serviceId: string = created.body.data.id;
      expect(created.body.data).toMatchObject({ title: "Rozetka o'rnatish", price: 50000, priceType: 'fixed', currency: 'UZS' });

      // Boshqa usta begona xizmat ID'sini bilsa ham o'zgartira/o'chira olmaydi.
      await request(app.getHttpServer())
        .put(`/api/v1/masters/me/services/${serviceId}`)
        .set(...authHeader(otherMasterToken))
        .send({ price: 1 })
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/masters/me/services/${serviceId}`)
        .set(...authHeader(otherMasterToken))
        .expect(404);

      await request(app.getHttpServer())
        .put(`/api/v1/masters/me/services/${serviceId}`)
        .set(...authHeader(masterToken))
        .send({ price: 70000 })
        .expect(200)
        .expect((res) => expect(res.body.data).toMatchObject({ id: serviceId, price: 70000, title: "Rozetka o'rnatish" }));

      const detail = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
      expect(detail.body.data.services).toEqual([expect.objectContaining({ id: serviceId, price: 70000 })]);

      // Qidiruv xizmat nomi bo'yicha ham ishlaydi.
      const search = await request(app.getHttpServer())
        .get(`/api/v1/masters?regionId=${regionId}&query=${encodeURIComponent('rozetka')}`)
        .expect(200);
      expect(search.body.data.map((m: { id: string }) => m.id)).toEqual([masterId]);

      await request(app.getHttpServer())
        .delete(`/api/v1/masters/me/services/${serviceId}`)
        .set(...authHeader(masterToken))
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/api/v1/masters/me/services/${serviceId}`)
        .set(...authHeader(masterToken))
        .expect(404);
    });

    it("manfiy narx yoki ortiqcha maydon 400", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/masters/me/services')
        .set(...authHeader(masterToken))
        .send({ title: 'Xizmat', price: -5 })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/masters/me/services')
        .set(...authHeader(masterToken))
        .send({ title: 'Xizmat', price: 5, masterId: otherMasterId })
        .expect(400);
    });
  });

  describe('portfolio va band holati', () => {
    it("rasm qo'shadi (yangisi birinchi), faqat o'zinikini URL bo'yicha o'chiradi", async () => {
      // Faqat o'z omborimiz URL'i qabul qilinadi (`images/<uuid>.<ext>`).
      const storage = app.get(StorageService);
      const first = storage.publicUrlForKey(`images/${randomUUID()}.jpg`);
      const second = storage.publicUrlForKey(`images/${randomUUID()}.jpg`);

      for (const url of [first, second]) {
        await request(app.getHttpServer())
          .post('/api/v1/masters/me/portfolio')
          .set(...authHeader(masterToken))
          .send({ url })
          .expect(201);
      }

      const detail = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
      expect(detail.body.data.portfolioImages).toEqual([second, first]);

      await request(app.getHttpServer())
        .delete(`/api/v1/masters/me/portfolio?url=${encodeURIComponent(first)}`)
        .set(...authHeader(otherMasterToken))
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/masters/me/portfolio?url=${encodeURIComponent(first)}`)
        .set(...authHeader(masterToken))
        .expect(200);

      const after = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
      expect(after.body.data.portfolioImages).toEqual([second]);

      await request(app.getHttpServer())
        .post('/api/v1/masters/me/portfolio')
        .set(...authHeader(masterToken))
        .send({ url: 'bu-url-emas' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/masters/me/portfolio')
        .set(...authHeader(masterToken))
        .send({ url: 'javascript:alert(1)' })
        .expect(400);
      // Begona host (kalit shakli to'g'ri bo'lsa ham) — 400.
      await request(app.getHttpServer())
        .post('/api/v1/masters/me/portfolio')
        .set(...authHeader(masterToken))
        .send({ url: `https://example.com/images/${randomUUID()}.jpg` })
        .expect(400);
    });

    it("band holatini almashtiradi va u public sahifada ko'rinadi", async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/masters/me/availability')
        .set(...authHeader(masterToken))
        .send({ isAvailable: false })
        .expect(200)
        .expect((res) => expect(res.body.data.isAvailable).toBe(false));

      const detail = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}`).expect(200);
      expect(detail.body.data.isAvailable).toBe(false);

      await request(app.getHttpServer())
        .patch('/api/v1/masters/me/availability')
        .set(...authHeader(masterToken))
        .send({ isAvailable: true })
        .expect(200);
    });
  });
});
