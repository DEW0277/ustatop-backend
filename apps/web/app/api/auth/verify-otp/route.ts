import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendRequest } from '@/lib/backend';
import { tokenCookieOptions, TOKEN_COOKIE } from '@/lib/config';
import { csrfError, failure } from '@/lib/route-utils';

interface VerifyOtpPayload {
  data?: {
    token?: string;
    user?: { id: string; phone: string; name: string; role: string; avatarUrl?: string };
  };
}

export async function POST(request: NextRequest) {
  const blocked = csrfError(request);
  if (blocked) return blocked;

  const body = await request.text();
  if (!body) return failure("So'rov tanasi bo'sh", 400);

  const { status, body: payload } = await backendRequest('/auth/verify-otp', { method: 'POST', body });

  if (status < 200 || status >= 300) {
    return NextResponse.json(payload, { status });
  }

  const { token, user } = (payload as VerifyOtpPayload).data ?? {};

  // Oddiy foydalanuvchi (client/master) uchun sessiya ochilmaydi: token tashlab yuboriladi.
  if (!token || !user || user.role !== 'admin') {
    return failure("Bu panel faqat administratorlar uchun", 403);
  }

  // Token faqat httpOnly cookie'ga yoziladi va javob tanasiga kirmaydi.
  const response = NextResponse.json({
    success: true,
    data: { user: { id: user.id, phone: user.phone, name: user.name, role: user.role, avatarUrl: user.avatarUrl } },
    message: 'Muvaffaqiyatli bajarildi',
  });
  response.cookies.set(TOKEN_COOKIE, token, tokenCookieOptions());
  return response;
}
