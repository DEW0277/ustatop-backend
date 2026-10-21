import { parseMockSmsAllowlist } from './mock-sms-allowlist.js';

const DEFAULT_JWT_SECRET = 'change_me_in_production';
const MIN_JWT_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

// Production'da xavfli standart qiymatlar bilan ishga tushib ketmaslik uchun: xato topilsa ilova
// umuman ko'tarilmaydi (jimgina zaif holatda ishlagandan ko'ra yaxshiroq). Dev/test'da hech narsa tekshirilmaydi.
export function findProductionConfigErrors(env: Env): string[] {
  if (env.NODE_ENV !== 'production') {
    return [];
  }

  const errors: string[] = [];
  const jwtSecret = env.JWT_SECRET ?? '';

  if (jwtSecret === DEFAULT_JWT_SECRET || jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET kamida ${MIN_JWT_SECRET_LENGTH} belgili tasodifiy qiymat bo'lishi kerak (masalan: openssl rand -hex 32)`,
    );
  }

  // Mock SMS'da OTP doim 123456 — production'da bu istalgan mijoz/usta raqami nomidan kirish demak (admin panel alohida: login + parol).
  // Haqiqiy SMS provider ulanmaguncha faqat ongli ravishda, yopiq sinov uchun yoqiladi — va faqat ruxsat ro'yxatidagi raqamlarga.
  const smsMode = env.SMS_MODE ?? 'mock';

  if (smsMode !== 'mock') {
    // `SmsProvider` hozir doim MockSmsProvider'ga bog'langan: SMS_MODE=eskiz jimgina mock'ni (123456) yoqib yuborardi.
    errors.push(`SMS_MODE=${smsMode} hali qo'llab-quvvatlanmaydi — faqat mock (haqiqiy provider: TASKS.md B-01)`);
  } else if (env.ALLOW_MOCK_SMS_IN_PRODUCTION !== 'true') {
    errors.push(
      "SMS_MODE=mock production'da taqiqlangan (OTP doim 123456). Yopiq sinov uchun ALLOW_MOCK_SMS_IN_PRODUCTION=true qo'ying",
    );
  } else {
    const { phones, invalid } = parseMockSmsAllowlist(env);

    if (invalid.length > 0) {
      errors.push(
        `MOCK_SMS_ALLOWED_PHONES da noto'g'ri raqam(lar): ${invalid.join(', ')} (format: +998XXXXXXXXX, vergul bilan ajratilgan)`,
      );
    } else if (phones.size === 0) {
      errors.push(
        "MOCK_SMS_ALLOWED_PHONES bo'sh — yopiq sinovda OTP faqat shu ro'yxatdagi raqamlarga beriladi (masalan +998901234567,+998901234568)",
      );
    }
  }

  if (!(env.CORS_ORIGINS ?? '').trim()) {
    errors.push("CORS_ORIGINS bo'sh — admin panel manzilini ko'rsating (masalan https://admin.example.uz)");
  }

  return errors;
}

export function assertProductionConfig(env: Env = process.env): void {
  const errors = findProductionConfigErrors(env);

  if (errors.length > 0) {
    throw new Error(`Production konfiguratsiyasi xavfsiz emas:\n- ${errors.join('\n- ')}`);
  }
}

// Reverse proxy (Nginx) ortida mijoz IP'si `X-Forwarded-For`dan olinishi kerak — aks holda rate limit
// barcha foydalanuvchilarni bitta IP (proxy) deb ko'radi. Qiymat — ishonchli proxy'lar soni (odatda 1).
// Proxy'siz muhitda yoqilmaydi: aks holda mijoz sarlavhani soxtalashtirib limitni aylanib o'tardi.
export function parseTrustProxy(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const hops = Number(value);

  if (!Number.isInteger(hops) || hops < 1 || hops > 5) {
    throw new Error(`TRUST_PROXY noto'g'ri: "${value}" (1 dan 5 gacha butun son — ishonchli proxy'lar soni)`);
  }

  return hops;
}
