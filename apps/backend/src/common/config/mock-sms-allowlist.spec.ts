import { describe, expect, it } from 'vitest';
import { parseMockSmsAllowlist } from './mock-sms-allowlist.js';

describe('parseMockSmsAllowlist', () => {
  it("dev/test muhitida faol emas (ro'yxat bilan ham)", () => {
    const result = parseMockSmsAllowlist({ NODE_ENV: 'development', MOCK_SMS_ALLOWED_PHONES: '+998901234567' });
    expect(result.active).toBe(false);
    expect(parseMockSmsAllowlist({ NODE_ENV: 'test' }).active).toBe(false);
    expect(parseMockSmsAllowlist({}).active).toBe(false);
  });

  it("production + haqiqiy provider (SMS_MODE != mock) da faol emas", () => {
    expect(parseMockSmsAllowlist({ NODE_ENV: 'production', SMS_MODE: 'eskiz' }).active).toBe(false);
  });

  it("production + SMS_MODE berilmagan yoki mock — faol", () => {
    expect(parseMockSmsAllowlist({ NODE_ENV: 'production' }).active).toBe(true);
    expect(parseMockSmsAllowlist({ NODE_ENV: 'production', SMS_MODE: 'mock' }).active).toBe(true);
  });

  it("raqamlarni kanonik +998XXXXXXXXX ga keltiradi, bo'sh elementlarni tashlaydi", () => {
    const result = parseMockSmsAllowlist({
      NODE_ENV: 'production',
      MOCK_SMS_ALLOWED_PHONES: '+998 90 123 45 67, 998901234568 ,901234569,,',
    });

    expect([...result.phones].sort()).toEqual(['+998901234567', '+998901234568', '+998901234569']);
    expect(result.invalid).toEqual([]);
  });

  it("noto'g'ri elementlarni asl qiymati bilan invalid ro'yxatiga qo'yadi", () => {
    const result = parseMockSmsAllowlist({ NODE_ENV: 'production', MOCK_SMS_ALLOWED_PHONES: 'abc,+1234,+998901234567' });

    expect([...result.phones]).toEqual(['+998901234567']);
    expect(result.invalid).toEqual(['abc', '+1234']);
  });

  it("berilmagan yoki faqat vergul/probel bo'lsa ro'yxat bo'sh", () => {
    expect(parseMockSmsAllowlist({ NODE_ENV: 'production' }).phones.size).toBe(0);
    expect(parseMockSmsAllowlist({ NODE_ENV: 'production', MOCK_SMS_ALLOWED_PHONES: ' , ' }).phones.size).toBe(0);
  });

  it("faol bo'lmaganda ham ro'yxatni parse qiladi", () => {
    const result = parseMockSmsAllowlist({ NODE_ENV: 'development', MOCK_SMS_ALLOWED_PHONES: '+998901234567' });
    expect(result.phones.has('+998901234567')).toBe(true);
  });
});
