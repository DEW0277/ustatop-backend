import { describe, expect, it } from 'vitest';
import { TOKEN_COOKIE_MAX_AGE, tokenCookieOptions } from './config';

describe('admin sessiya cookie muddati', () => {
  it("backend ADMIN_TOKEN_TTL_SECONDS bilan bir xil: 12 soat", () => {
    expect(TOKEN_COOKIE_MAX_AGE).toBe(43_200);
    expect(tokenCookieOptions().maxAge).toBe(43_200);
  });
});
