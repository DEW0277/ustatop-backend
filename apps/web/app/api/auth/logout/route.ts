import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { clearTokenCookie, csrfError } from '@/lib/route-utils';

export async function POST(request: NextRequest) {
  const blocked = csrfError(request);
  if (blocked) return blocked;

  return clearTokenCookie(NextResponse.json({ success: true, data: null, message: 'Chiqildi' }));
}
