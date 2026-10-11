import { describe, expect, it } from 'vitest';
import { assertProductionConfig, findProductionConfigErrors, parseTrustProxy } from './production-guard.js';

const SAFE = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(64),
  SMS_MODE: 'eskiz',
  CORS_ORIGINS: 'https://admin.example.uz',
};

describe('findProductionConfigErrors', () => {
  it("dev/test muhitida hech narsa tekshirilmaydi (standart qiymatlar bilan ham)", () => {
    expect(findProductionConfigErrors({ NODE_ENV: 'development', JWT_SECRET: 'change_me_in_production' })).toEqual([]);
    expect(findProductionConfigErrors({})).toEqual([]);
  });

  it("to'g'ri production konfiguratsiyasida xato yo'q", () => {
    expect(findProductionConfigErrors(SAFE)).toEqual([]);
  });

  it.each(['change_me_in_production', 'short-secret', ''])("zaif JWT_SECRET (%j) rad etiladi", (secret) => {
    expect(findProductionConfigErrors({ ...SAFE, JWT_SECRET: secret })).toHaveLength(1);
  });

  it("mock SMS production'da rad etiladi — SMS_MODE berilmagan holatda ham", () => {
    expect(findProductionConfigErrors({ ...SAFE, SMS_MODE: 'mock' })[0]).toMatch(/SMS_MODE=mock/);
    expect(findProductionConfigErrors({ ...SAFE, SMS_MODE: undefined })[0]).toMatch(/SMS_MODE=mock/);
  });

  it("mock SMS faqat aniq ALLOW_MOCK_SMS_IN_PRODUCTION=true bilan o'tadi", () => {
    expect(findProductionConfigErrors({ ...SAFE, SMS_MODE: 'mock', ALLOW_MOCK_SMS_IN_PRODUCTION: 'true' })).toEqual([]);
    expect(findProductionConfigErrors({ ...SAFE, SMS_MODE: 'mock', ALLOW_MOCK_SMS_IN_PRODUCTION: '1' })).toHaveLength(1);
  });

  it("bo'sh CORS_ORIGINS rad etiladi", () => {
    expect(findProductionConfigErrors({ ...SAFE, CORS_ORIGINS: '  ' })).toHaveLength(1);
  });

  it("assertProductionConfig barcha xatolarni bitta xabarda beradi", () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET[\s\S]*SMS_MODE[\s\S]*CORS_ORIGINS/);
  });
});

describe('parseTrustProxy', () => {
  it("berilmagan/bo'sh bo'lsa yoqilmaydi", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy(' ')).toBeUndefined();
  });

  it("proxy'lar sonini qaytaradi", () => {
    expect(parseTrustProxy('1')).toBe(1);
  });

  it.each(['true', '0', '-1', '1.5', '99'])("noto'g'ri qiymat (%s) xato beradi — 'true' hamma narsaga ishonish demak", (value) => {
    expect(() => parseTrustProxy(value)).toThrow(/TRUST_PROXY/);
  });
});
