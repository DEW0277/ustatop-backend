import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendRequest } from '@/lib/backend';
import { csrfError, failure } from '@/lib/route-utils';

export async function POST(request: NextRequest) {
  const blocked = csrfError(request);
  if (blocked) return blocked;

  const body = await request.text();
  if (!body) return failure("So'rov tanasi bo'sh", 400);

  const { status, body: payload } = await backendRequest('/auth/send-otp', { method: 'POST', body });
  return NextResponse.json(payload, { status });
}
