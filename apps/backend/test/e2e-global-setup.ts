import { execFileSync } from 'node:child_process';
import { Redis } from 'ioredis';
import { TEST_DATABASE_URL } from './e2e-db.js';

// Vitest `globalSetup`: butun e2e ishga tushirish uchun BIR MARTA chaqiriladi, alohida processda.
// Vazifasi — test schema'sini (`?schema=test`) tayyorlash. Bu yerdagi `process.env` o'zgarishi
// test worker'lariga o'tmaydi (alohida process), shuning uchun DATABASE_URL override har bir test
// faylida `e2e-setup.ts` (`setupFiles`) orqali alohida qilinadi.
export default async function setup() {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  // Redis dev bilan baham ko'riladi (docker-compose: localhost:6379, CLAUDE.md) va faqat OTP
  // saqlash uchun ishlatiladi. Oldingi (masalan yarim to'xtagan) e2e ishga tushirishdan qolgan
  // `otp:*` kalitlar keyingi ishga tushirishda "keyingi urinish uchun kuting" xatosiga olib
  // kelmasligi uchun tozalanadi. `.env`da boshqacha ko'rsatilgan bo'lsa shuni ishlatadi.
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const keys = await redis.keys('otp:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.quit();
}
