import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { NormalizedPhone, normalizeUzPhone } from './normalized-phone.decorator.js';

class Dto {
  @NormalizedPhone()
  phone!: string;
}

describe('normalizeUzPhone', () => {
  it.each([
    ['+998 90 123 45 67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['90 123 45 67', '+998901234567'],
    ['+998901234567', '+998901234567'],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUzPhone(input)).toBe(expected);
  });

  it("noto'g'ri uzunlikdagi raqamni o'zgartirmaydi (validatsiya rad etadi)", () => {
    expect(normalizeUzPhone('12345')).toBe('12345');
  });
});

describe('@NormalizedPhone', () => {
  it("probelli mobil formatni qabul qiladi va kanonik ko'rinishga keltiradi", () => {
    const dto = plainToInstance(Dto, { phone: '+998 90 123 45 67' });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.phone).toBe('+998901234567');
  });

  it("yaroqsiz raqamni rad etadi", () => {
    expect(validateSync(plainToInstance(Dto, { phone: '12345' }))).toHaveLength(1);
  });
});
