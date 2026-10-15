import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, createMasterProfile, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '09';

describe("Akkauntni o'chirish (e2e)", () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  let regionId: string;
  let districtId: string;
  let categoryId: string;
  let masterId: string;
  let master: { token: string; userId: string };
  let client: { token: string; userId: string };
  let adminToken: string;
  const deletedUserIds: string[] = [];

  function createOrder(clientId: string | null, status: 'pending' | 'completed', comment?: string) {
    return prisma.order.create({
      data: {
        masterId,
        clientId,
        serviceTitle: 'E2E xizmat',
        price: 100000,
        clientName: 'Haqiqiy Ism',
        clientPhone: testPhone(TAG, 2),
        districtId,
        address: 'Uy manzili, 5-xonadon',
        preferredDate: 'Bugun',
        preferredTime: '12:00 - 15:00',
        comment,
        status,
      },
    });
  }

  beforeAll(async () => {
    ({ app } = await createTestApp());

    regionId = (await prisma.region.create({ data: { nameUz: 'E2E account viloyati', nameRu: 'E2E', code: `E2E-${TAG}` } })).id;
    districtId = (await prisma.district.create({ data: { nameUz: 'E2E account tumani', nameRu: 'E2E', regionId } })).id;
    categoryId = (
      await prisma.category.create({
        data: { nameUz: 'E2E account kategoriya', nameRu: 'E2E', icon: 'test', description: 'test', slug: `e2e-account-${TAG}` },
      })
    ).id;

    master = await otpLogin(app, testPhone(TAG, 1));
    masterId = await createMasterProfile(prisma, master.userId, { regionId, districtId, categoryId });
    client = await otpLogin(app, testPhone(TAG, 2));

    const admin = await otpLogin(app, testPhone(TAG, 3));
    adminToken = admin.token;
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { masterId } });
    await prisma.order.deleteMany({ where: { masterId } });
    await prisma.user.deleteMany({
      where: { OR: [{ phone: { startsWith: testPhonePrefix(TAG) } }, { id: { in: deletedUserIds } }] },
    });
    await prisma.district.delete({ where: { id: districtId } });
    await prisma.region.delete({ where: { id: regionId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
    await app.close();
  });

  it("tokensiz 401; administrator o'z akkauntini ilova orqali o'chira olmaydi (403)", async () => {
    await request(app.getHttpServer()).delete('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).delete('/api/v1/auth/me').set(...authHeader(adminToken)).expect(403);
  });

  it("mijoz: akkaunt anonimlashadi, token darhol 401, faol buyurtma bekor bo'ladi, tarix va sharh qoladi, raqam bo'shaydi", async () => {
    const active = await createOrder(client.userId, 'pending');
    const done = await createOrder(client.userId, 'completed', 'Darvoza kodi 1234');
    await request(app.getHttpServer())
      .post(`/api/v1/masters/${masterId}/reviews`)
      .set(...authHeader(client.token))
      .send({ rating: 5, comment: 'Zo`r ishladi' })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/v1/favorites/${masterId}`).set(...authHeader(client.token)).expect(201);

    await request(app.getHttpServer())
      .delete('/api/v1/auth/me')
      .set(...authHeader(client.token))
      .expect(200)
      .expect((res) => expect(res.body.data).toEqual({ deleted: true }));
    deletedUserIds.push(client.userId);

    await request(app.getHttpServer()).get('/api/v1/auth/me').set(...authHeader(client.token)).expect(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: client.userId } });
    expect(user).toMatchObject({ phone: `deleted:${client.userId}`, name: "O'chirilgan foydalanuvchi", isBlocked: true });
    expect(user.deletedAt).toBeInstanceOf(Date);

    const orders = await prisma.order.findMany({ where: { id: { in: [active.id, done.id] } } });
    expect(orders.find((o) => o.id === active.id)).toMatchObject({ status: 'cancelled', cancelledBy: 'CLIENT' });
    for (const order of orders) {
      expect(order).toMatchObject({ clientName: "O'chirilgan foydalanuvchi", clientPhone: '', address: '—', comment: null });
    }
    expect(orders.find((o) => o.id === done.id)?.status).toBe('completed');

    // Sharh va reyting saqlanadi, muallif anonim.
    const reviews = await request(app.getHttpServer()).get(`/api/v1/masters/${masterId}/reviews`).expect(200);
    expect(reviews.body.data).toEqual([
      expect.objectContaining({ rating: 5, userName: "O'chirilgan foydalanuvchi", userAvatar: '' }),
    ]);
    expect(await prisma.favoriteMaster.count({ where: { userId: client.userId } })).toBe(0);

    // Shu raqam bilan yangi (boshqa) akkaunt ochiladi.
    const fresh = await otpLogin(app, testPhone(TAG, 2));
    expect(fresh.userId).not.toBe(client.userId);

    // Admin o'chirilgan akkauntni blokdan chiqarib "tiriltira" olmaydi.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${client.userId}/block`)
      .set(...authHeader(adminToken))
      .send({ isBlocked: false })
      .expect(409);
    const listed = await request(app.getHttpServer())
      .get(`/api/v1/admin/users?query=${encodeURIComponent("O'chirilgan")}&limit=100`)
      .set(...authHeader(adminToken))
      .expect(200);
    expect(listed.body.data.items.find((u: { id: string }) => u.id === client.userId)?.deletedAt).toEqual(expect.any(String));
  });

  it("usta: ro'yxatdan yo'qoladi, kelgan faol buyurtmasi usta nomidan bekor bo'ladi, profil mazmuni tozalanadi", async () => {
    const active = await createOrder(null, 'pending');
    await prisma.masterService.create({ data: { masterId, title: 'Xizmat', price: 1000 } });
    await prisma.portfolioImage.create({ data: { masterId, url: 'https://example.com/p.jpg' } });

    await request(app.getHttpServer()).delete('/api/v1/auth/me').set(...authHeader(master.token)).expect(200);
    deletedUserIds.push(master.userId);

    expect(await prisma.order.findUniqueOrThrow({ where: { id: active.id } })).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'MASTER',
    });

    const list = await request(app.getHttpServer()).get(`/api/v1/masters?regionId=${regionId}`).expect(200);
    expect(list.body.data).toEqual([]);

    const profile = await prisma.masterProfile.findUniqueOrThrow({
      where: { id: masterId },
      include: { services: true, portfolio: true, categories: true },
    });
    expect(profile).toMatchObject({ phone: '', telegram: null, isAvailable: false, isVerified: false, rating: 5 });
    expect(profile.services).toEqual([]);
    expect(profile.portfolio).toEqual([]);
    expect(profile.categories).toEqual([]);
  });
});
