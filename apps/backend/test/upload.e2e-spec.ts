import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StorageService } from '../src/modules/upload/storage.service.js';
import { authHeader, createTestApp, otpLogin, testPhone, testPhonePrefix } from './e2e-utils.js';

const TAG = '08';

// 1x1 shaffof PNG — haqiqiy rasm (magic bytes + to'g'ri tuzilma).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

// Haqiqiy fayl ombori kerak (dev: `docker compose up -d` — Garage + storage-proxy, docs/TZ.md §2). Ombor javob
// bermasa blok ogohlantirish bilan o'tkazib yuboriladi; CI'da esa `E2E_REQUIRE_STORAGE=1` — o'tkazib yuborish xato.
const STORAGE_ORIGIN = new URL(process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/ustatop-uploads').origin;
const storageAvailable = await fetch(`${STORAGE_ORIGIN}/healthz`, { signal: AbortSignal.timeout(2000) })
  .then((res) => res.ok)
  .catch(() => false);

if (!storageAvailable) {
  if (process.env.E2E_REQUIRE_STORAGE === '1') {
    throw new Error(`[upload.e2e] Fayl ombori (${STORAGE_ORIGIN}) javob bermadi, E2E_REQUIRE_STORAGE=1`);
  }
  console.warn(`[upload.e2e] Fayl ombori (${STORAGE_ORIGIN}) javob bermadi — upload e2e testlari o'tkazib yuborildi`);
}

describe.skipIf(!storageAvailable)('Upload (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  let token: string;
  const uploadedKeys: string[] = [];

  beforeAll(async () => {
    ({ app } = await createTestApp());
    token = (await otpLogin(app, testPhone(TAG, 1))).token;
  });

  afterAll(async () => {
    const storage = app.get(StorageService);
    for (const key of uploadedKeys) {
      await storage
        .getS3Client()
        .send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET ?? 'ustatop-uploads', Key: key }));
    }
    await prisma.user.deleteMany({ where: { phone: { startsWith: testPhonePrefix(TAG) } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('tokensiz 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/upload/single')
      .attach('file', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
      .expect(401);
  });

  it("haqiqiy PNG yuklanadi va qaytgan public URL orqali ochiladi", async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/upload/single')
      .set(...authHeader(token))
      .attach('file', PNG_1X1, { filename: 'rasm.png', contentType: 'image/png' })
      .expect(201);

    const url: string = res.body.data.url;
    expect(url).toMatch(/\/images\/[0-9a-f-]{36}\.png$/);
    uploadedKeys.push(url.slice(url.indexOf('images/')));

    const file = await fetch(url);
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer()).equals(PNG_1X1)).toBe(true);
  });

  it("avatar almashtirilganda eski fayl ombordan o'chadi, yangisi qoladi (dev URL — localhost — qabul qilinadi)", async () => {
    const upload = async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/upload/single')
        .set(...authHeader(token))
        .attach('file', PNG_1X1, { filename: 'avatar.png', contentType: 'image/png' })
        .expect(201);
      const url: string = res.body.data.url;
      uploadedKeys.push(url.slice(url.indexOf('images/')));
      return url;
    };

    const first = await upload();
    await request(app.getHttpServer())
      .put('/api/v1/auth/profile')
      .set(...authHeader(token))
      .send({ avatarUrl: first })
      .expect(200);

    const second = await upload();
    await request(app.getHttpServer())
      .put('/api/v1/auth/profile')
      .set(...authHeader(token))
      .send({ avatarUrl: second })
      .expect(200)
      .expect((res) => expect(res.body.data.avatarUrl).toBe(second));

    expect((await fetch(first)).status).toBe(404);
    expect((await fetch(second)).status).toBe(200);
  });

  it("fayl yo'q yoki rasm emas (kengaytma/MIME soxta bo'lsa ham) 400", async () => {
    await request(app.getHttpServer()).post('/api/v1/upload/single').set(...authHeader(token)).expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/upload/single')
      .set(...authHeader(token))
      .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'rasm.png', contentType: 'image/png' })
      .expect(400);
  });

  it("10 MB dan katta fayl 413", async () => {
    const big = Buffer.concat([PNG_1X1, Buffer.alloc(10 * 1024 * 1024)]);

    await request(app.getHttpServer())
      .post('/api/v1/upload/single')
      .set(...authHeader(token))
      .attach('file', big, { filename: 'katta.png', contentType: 'image/png' })
      .expect(413);
  });
});
