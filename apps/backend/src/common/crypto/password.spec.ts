import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it("to'g'ri parolni tasdiqlaydi, noto'g'risini rad etadi", async () => {
    const hash = await hashPassword('S3cret-parol!');

    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('S3cret-parol!', hash)).toBe(true);
    expect(await verifyPassword('S3cret-parol', hash)).toBe(false);
  });

  it('har safar yangi tuz ishlatadi (bir xil parol — turli hash)', async () => {
    expect(await hashPassword('bir-xil-parol')).not.toBe(await hashPassword('bir-xil-parol'));
  });

  it("buzuq yoki begona formatdagi hash uchun xato otmaydi, false qaytaradi", async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'plain-text-password')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$aa$bb')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$zz$')).toBe(false);
  });
});
