import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatPrice, formatShortDate, UZ_MONTHS } from './format';

describe('formatDate', () => {
  it('oddiy sanani to‘g‘ri formatlaydi', () => {
    expect(formatDate('2026-10-09T09:05:00Z')).toBe('9-okt, 2026');
    expect(formatDate('2026-05-15T12:00:00Z')).toBe('15-may, 2026');
    expect(formatDate('2026-01-01T08:00:00Z')).toBe('1-yan, 2026');
  });

  it('UTC yarim tundan o‘tganda Toshkent vaqt zonasi (UTC+5) bo‘yicha keyingi kunga o‘tadi', () => {
    // 2026-10-09 20:30 UTC -> Toshkentda 2026-10-10 01:30
    expect(formatDate('2026-10-09T20:30:00Z')).toBe('10-okt, 2026');
  });

  it('Date obyekti qabul qilganda to‘g‘ri ishlaydi', () => {
    const date = new Date('2026-12-31T20:00:00Z'); // Toshkentda 2027-01-01 01:00
    expect(formatDate(date)).toBe('1-yan, 2027');
  });

  it('yaroqsiz qiymatlarda "—" qaytaradi', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate(new Date(NaN))).toBe('—');
  });

  it('barcha 12 oy nomini to‘g‘ri qo‘llaydi', () => {
    const dates = [
      '2026-01-15T10:00:00Z',
      '2026-02-15T10:00:00Z',
      '2026-03-15T10:00:00Z',
      '2026-04-15T10:00:00Z',
      '2026-05-15T10:00:00Z',
      '2026-06-15T10:00:00Z',
      '2026-07-15T10:00:00Z',
      '2026-08-15T10:00:00Z',
      '2026-09-15T10:00:00Z',
      '2026-10-15T10:00:00Z',
      '2026-11-15T10:00:00Z',
      '2026-12-15T10:00:00Z',
    ];

    dates.forEach((d, index) => {
      expect(formatDate(d)).toBe(`15-${UZ_MONTHS[index]}, 2026`);
    });
  });
});

describe('formatDateTime', () => {
  it('sana va vaqtni 24-soat formatida chiqaradi', () => {
    expect(formatDateTime('2026-10-09T09:05:00Z')).toBe('9-okt, 2026, 14:05');
  });

  it('UTC yarim tundan o‘tishda vaqt 00 dan boshlanadi', () => {
    // 19:00 UTC -> 00:00 Toshkent
    expect(formatDateTime('2026-10-09T19:00:00Z')).toBe('10-okt, 2026, 00:00');
    // 20:30 UTC -> 01:30 Toshkent
    expect(formatDateTime('2026-10-09T20:30:00Z')).toBe('10-okt, 2026, 01:30');
  });

  it('yaroqsiz qiymatlarda "—" qaytaradi', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('invalid')).toBe('—');
  });
});

describe('formatShortDate', () => {
  it('yil ko‘rsatilmagan qisqa sana qaytaradi', () => {
    expect(formatShortDate('2026-10-09T09:05:00Z')).toBe('9-okt');
    expect(formatShortDate('2026-10-09T20:30:00Z')).toBe('10-okt');
    expect(formatShortDate('invalid')).toBe('—');
  });
});

describe('formatPrice', () => {
  it("minglarni probel bilan ajratadi va so'm qo'shadi", () => {
    expect(formatPrice(150000)).toBe("150 000 so'm");
    expect(formatPrice(1250000)).toBe("1 250 000 so'm");
    expect(formatPrice(999)).toBe("999 so'm");
    expect(formatPrice(49999.6)).toBe("50 000 so'm");
  });

  it("narx yo'q yoki 0 bo'lsa — kelishuv asosida", () => {
    expect(formatPrice(0)).toBe('Kelishuv asosida');
    expect(formatPrice(null)).toBe('Kelishuv asosida');
    expect(formatPrice(undefined)).toBe('Kelishuv asosida');
  });
});
