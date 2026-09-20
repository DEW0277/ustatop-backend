import { describe, expect, it } from 'vitest';
import { statusTextUz } from './order.mapper.js';

describe('statusTextUz', () => {
  it.each([
    ['pending', null, 'Kutilmoqda'],
    ['in_progress', null, 'Qabul qilindi'],
    ['completed', null, 'Bajarildi'],
    ['cancelled', 'CLIENT', 'Bekor qilindi'],
    ['cancelled', null, 'Bekor qilindi'],
    ['cancelled', 'MASTER', 'Rad etildi'],
  ] as const)('%s / %s -> %s', (status, cancelledBy, expected) => {
    expect(statusTextUz(status, cancelledBy)).toBe(expected);
  });
});
