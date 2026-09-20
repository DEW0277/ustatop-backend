// Sof funksiyalar (Next/Node API'siz) — unit test qilinadi.

const SEGMENT_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
const PUBLIC_READ_ROOTS = new Set(['regions', 'districts', 'categories']);

// Brauzer -> panel proksisi orqali backend'ning faqat kerakli qismiga ruxsat beriladi:
// `admin/*` (barcha metodlar) va ochiq ma'lumotnomalarni o'qish (GET).
export function isAllowedProxyPath(method: string, segments: string[]): boolean {
  if (segments.length === 0 || !segments.every((segment) => SEGMENT_REGEX.test(segment))) {
    return false;
  }

  const [root] = segments;

  if (root === 'admin') {
    return segments.length > 1;
  }

  return method === 'GET' && PUBLIC_READ_ROOTS.has(root);
}

// CSRF himoyasi: holatni o'zgartiruvchi so'rovlarda Origin sarlavhasi bizning host bilan bir xil bo'lishi shart.
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Open redirect'dan himoya: faqat panel ichidagi mutlaq yo'llar (`/users`), `//evil.com` yoki `/\evil.com` emas.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) {
    return '/';
  }

  return next;
}
