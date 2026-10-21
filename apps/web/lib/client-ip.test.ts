import { describe, expect, it } from 'vitest';
import { buildBackendHeaders, clientIpFromHeaders } from './client-ip';

function fake(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe('clientIpFromHeaders', () => {
  it('x-real-ip dagi IPv4 va IPv6 ni qaytaradi (trim bilan)', () => {
    expect(clientIpFromHeaders(fake({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIpFromHeaders(fake({ 'x-real-ip': ' 203.0.113.7 ' }))).toBe('203.0.113.7');
    expect(clientIpFromHeaders(fake({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('sarlavha yo\'q yoki yaroqsiz bo\'lsa undefined', () => {
    for (const bad of ['', 'unknown', '1.2.3.4, 5.6.7.8', '1.2.3.4 x', '1.2.3.4\nX-Evil: 1']) {
      expect(clientIpFromHeaders(fake({ 'x-real-ip': bad }))).toBeUndefined();
    }
    expect(clientIpFromHeaders(fake({}))).toBeUndefined();
  });

  it('x-forwarded-for ga hech qachon ishonmaydi', () => {
    expect(clientIpFromHeaders(fake({ 'x-forwarded-for': '6.6.6.6' }))).toBeUndefined();
    expect(clientIpFromHeaders(fake({ 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
  });
});

describe('buildBackendHeaders', () => {
  it('clientIp bo\'lsa X-Forwarded-For aynan shu qiymat', () => {
    expect(buildBackendHeaders({ hasBody: false, clientIp: '203.0.113.7' })['X-Forwarded-For']).toBe('203.0.113.7');
  });

  it('clientIp yo\'q bo\'lsa X-Forwarded-For kaliti umuman yo\'q', () => {
    expect(buildBackendHeaders({ hasBody: false })).not.toHaveProperty('X-Forwarded-For');
  });

  it('token -> Authorization, hasBody -> Content-Type', () => {
    const withAll = buildBackendHeaders({ token: 'abc', hasBody: true });
    expect(withAll).toMatchObject({ Accept: 'application/json', Authorization: 'Bearer abc', 'Content-Type': 'application/json' });

    const bare = buildBackendHeaders({ hasBody: false });
    expect(bare).toEqual({ Accept: 'application/json' });
  });
});
