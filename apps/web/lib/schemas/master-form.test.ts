import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTER_FORM,
  masterFormSchema,
  masterFormToApiBody,
  normalizeUzPhone,
  type MasterFormValues,
} from './master-form';

const valid: MasterFormValues = {
  ...DEFAULT_MASTER_FORM,
  phone: '+998 90 123 45 67',
  firstName: 'Alisher',
  lastName: 'Valiyev',
  bio: '10 yillik tajribaga ega elektrik',
  regionId: 'reg-1',
  districtId: 'dis-1',
  address: 'Chilonzor 9-daha',
};

describe('normalizeUzPhone', () => {
  it('probelli, +siz va 9 xonali variantlarni kanonik formatga keltiradi', () => {
    expect(normalizeUzPhone('+998 90 123 45 67')).toBe('+998901234567');
    expect(normalizeUzPhone('998901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('(90) 123-45-67')).toBe('+998901234567');
  });

  it('to‘liq bo‘lmagan yoki begona raqam uchun null', () => {
    expect(normalizeUzPhone('+998')).toBeNull();
    expect(normalizeUzPhone('+998 90 123 45')).toBeNull();
    expect(normalizeUzPhone('+7 900 123 45 67 8')).toBeNull();
  });
});

describe('masterFormSchema', () => {
  it('to‘g‘ri to‘ldirilgan formani qabul qiladi', () => {
    expect(masterFormSchema.safeParse(valid).success).toBe(true);
  });

  it('standart (bo‘sh) forma majburiy maydonlar bo‘yicha xato beradi', () => {
    const res = masterFormSchema.safeParse(DEFAULT_MASTER_FORM);
    expect(res.success).toBe(false);
    if (!res.success) {
      const fields = res.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(
        expect.arrayContaining(['phone', 'firstName', 'lastName', 'bio', 'regionId', 'districtId', 'address']),
      );
    }
  });

  it('backend chegaralarini takrorlaydi: tajriba 0–60, ish kuni kamida bitta, kategoriya ko‘pi bilan 8', () => {
    expect(masterFormSchema.safeParse({ ...valid, experienceYears: '61' }).success).toBe(false);
    expect(masterFormSchema.safeParse({ ...valid, experienceYears: '-1' }).success).toBe(false);
    expect(masterFormSchema.safeParse({ ...valid, experienceYears: '60' }).success).toBe(true);
    expect(masterFormSchema.safeParse({ ...valid, workDays: [] }).success).toBe(false);
    expect(masterFormSchema.safeParse({ ...valid, workEnd: '24:00' }).success).toBe(false);
    expect(
      masterFormSchema.safeParse({ ...valid, categoryIds: Array.from({ length: 9 }, (_, i) => `c-${i}`) }).success,
    ).toBe(false);
  });
});

describe('masterFormToApiBody', () => {
  it('telefonni normallashtiradi, bo‘sh telegramni yubormaydi, bo‘sh tajribani 0 qiladi', () => {
    const body = masterFormToApiBody(valid);
    expect(body.phone).toBe('+998901234567');
    expect(body.telegram).toBeUndefined();
    expect(body.experienceYears).toBe(0);
    expect(body.isVerified).toBe(true);
    expect(body).not.toHaveProperty('workStart');
  });

  it('ish vaqtini `workingHours`ga yig‘adi va kunlarni hafta tartibida yuboradi', () => {
    const body = masterFormToApiBody({
      ...valid,
      experienceYears: '7',
      telegram: '@usta',
      workStart: '08:30',
      workEnd: '20:00',
      workDays: ['sun', 'mon', 'fri'],
    });
    expect(body.workingHours).toEqual({ start: '08:30', end: '20:00', workDays: ['mon', 'fri', 'sun'] });
    expect(body.experienceYears).toBe(7);
    expect(body.telegram).toBe('@usta');
  });
});
