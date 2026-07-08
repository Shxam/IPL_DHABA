import { NextRequest, NextResponse } from 'next/server';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });

  // Set httpOnly cookie for 30 days
  response.cookies.set('ipl_dhaba_last_order', id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}
