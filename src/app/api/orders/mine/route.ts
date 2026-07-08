import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  // 1. Get OTP JWT from headers
  let otpToken = request.headers.get('x-otp-token') || '';
  if (!otpToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      otpToken = authHeader.substring(7);
    }
  }

  if (!otpToken) {
    return NextResponse.json({ error: 'Phone verification token is required' }, { status: 403 });
  }

  // 2. Verify token
  let decoded: any = null;
  try {
    decoded = jwt.verify(otpToken, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch (e) {
    return NextResponse.json({ error: 'Verification token is invalid or expired' }, { status: 403 });
  }

  const normalizePhone = (num: string) => {
    const trimmed = num.trim();
    if (/^\d{10}$/.test(trimmed)) {
      return `+91${trimmed}`;
    }
    return trimmed;
  };

  if (!decoded || !decoded.phone || !decoded.verified || normalizePhone(decoded.phone) !== normalizePhone(phone)) {
    return NextResponse.json({ error: 'Access denied: phone number mismatch' }, { status: 403 });
  }

  const adminDb = createAdminClient();

  try {
    // 3. Fetch orders for that phone number, newest first
    const { data: orders, error } = await adminDb
      .from('orders')
      .select('*, order_items(*)')
      .eq('phone', normalizePhone(phone))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Orders Mine] DB fetch failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // 4. Sanitize responses: remove sequential_id from all orders
    const sanitizedOrders = (orders || []).map((o) => {
      const { sequential_id, ...customerSafeOrder } = o;
      return customerSafeOrder;
    });

    return NextResponse.json({ orders: sanitizedOrders });
  } catch (err: any) {
    console.error('[API Orders Mine] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
