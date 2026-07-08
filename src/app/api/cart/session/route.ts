import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Check if session cookie already exists
  let sessionId = request.cookies.get('ipl_dhaba_cart_session')?.value;

  const response = NextResponse.json({ sessionId: sessionId || null });

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    // Set cookie: 24-hour expiry, httpOnly, Secure, SameSite=Lax
    response.cookies.set('ipl_dhaba_cart_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    // Update the return value
    return NextResponse.json({ sessionId }, {
      headers: response.headers,
    });
  }

  return response;
}
