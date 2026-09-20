import { describe, expect, it } from 'vitest';
import { isAllowedProxyPath, isSameOrigin, safeNextPath } from './request-guard';

describe('isAllowedProxyPath', () => {
  it('admin/* yo\'llariga barcha metodlarda ruxsat beradi', () => {
    expect(isAllowedProxyPath('GET', ['admin', 'users'])).toBe(true);
    expect(isAllowedProxyPath('PATCH', ['admin', 'users', '0f6c736d-47b1-4620-8c41-25b6986dec01', 'block'])).toBe(true);
    expect(isAllowedProxyPath('DELETE', ['admin', 'reviews', 'abc'])).toBe(true);
  });

  it('bo\'sh `admin` (ildiz) va bo\'sh yo\'lni rad etadi', () => {
    expect(isAllowedProxyPath('GET', ['admin'])).toBe(false);
    expect(isAllowedProxyPath('GET', [])).toBe(false);
  });

  it('ochiq ma\'lumotnomalarni faqat GET bilan o\'qishga ruxsat beradi', () => {
    expect(isAllowedProxyPath('GET', ['regions'])).toBe(true);
    expect(isAllowedProxyPath('GET', ['categories'])).toBe(true);
    expect(isAllowedProxyPath('POST', ['regions'])).toBe(false);
    expect(isAllowedProxyPath('DELETE', ['categories', 'x'])).toBe(false);
  });

  it('boshqa backend yo\'llarini (auth, orders, upload...) proksi qilmaydi', () => {
    for (const root of ['auth', 'orders', 'masters', 'upload', 'docs']) {
      expect(isAllowedProxyPath('GET', [root, 'me'])).toBe(false);
    }
  });

  it('yo\'l traversal va begona belgilarni rad etadi', () => {
    expect(isAllowedProxyPath('GET', ['admin', '..', 'auth', 'me'])).toBe(false);
    expect(isAllowedProxyPath('GET', ['admin', '%2e%2e'])).toBe(false);
    expect(isAllowedProxyPath('GET', ['admin', 'users?x=1'])).toBe(false);
    expect(isAllowedProxyPath('GET', ['admin', 'a/b'])).toBe(false);
    expect(isAllowedProxyPath('GET', ['admin', ''])).toBe(false);
  });
});

describe('isSameOrigin', () => {
  it('Origin host bilan mos kelsa true', () => {
    expect(isSameOrigin('http://localhost:3001', 'localhost:3001')).toBe(true);
    expect(isSameOrigin('https://admin.ustatop.uz', 'admin.ustatop.uz')).toBe(true);
  });

  it('begona, yo\'q yoki buzuq Origin uchun false', () => {
    expect(isSameOrigin('https://evil.com', 'admin.ustatop.uz')).toBe(false);
    expect(isSameOrigin('https://admin.ustatop.uz.evil.com', 'admin.ustatop.uz')).toBe(false);
    expect(isSameOrigin(null, 'admin.ustatop.uz')).toBe(false);
    expect(isSameOrigin('null', 'admin.ustatop.uz')).toBe(false);
    expect(isSameOrigin('https://admin.ustatop.uz', null)).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('panel ichidagi yo\'llarni saqlaydi', () => {
    expect(safeNextPath('/users?page=2')).toBe('/users?page=2');
  });

  it('open redirect va login sikli urinishlarini "/" ga aylantiradi', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'users', '/login', '/login?next=/', '', null, undefined]) {
      expect(safeNextPath(bad)).toBe('/');
    }
  });
});
