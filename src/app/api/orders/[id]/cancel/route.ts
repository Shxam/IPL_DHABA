import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';
import { sendSMS } from '@/services/sms';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const adminDb = createAdminClient();

  try {
    // 1. Extract and verify OTP JWT from headers
    let otpToken = request.headers.get('x-otp-token') || '';
    if (!otpToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        otpToken = authHeader.substring(7);
      }
    }

    if (!otpToken) {
      return NextResponse.json({ error: 'Phone verification is required' }, { status: 403 });
    }

    let decoded: any = null;
    try {
      decoded = jwt.verify(otpToken, process.env.JWT_SECRET || 'fallback-secret-key');
    } catch (e) {
      return NextResponse.json({ error: 'Verification token is invalid or expired' }, { status: 403 });
    }

    if (!decoded || !decoded.phone || !decoded.verified) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
    }

    // 2. Fetch the order
    const { data: order, error: fetchError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Match phone number (normalized)
    const normalizePhone = (num: string) => {
      const trimmed = num.trim();
      if (/^\d{10}$/.test(trimmed)) {
        return `+91${trimmed}`;
      }
      return trimmed;
    };

    if (normalizePhone(decoded.phone) !== normalizePhone(order.phone)) {
      return NextResponse.json({ error: 'Phone number mismatch' }, { status: 403 });
    }

    // 4. Ensure status is still 'placed'
    if (order.status !== 'placed') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled at this stage.' },
        { status: 409 }
      );
    }

    // 5. Cancel the order
    const { data: updatedOrder, error: updateError } = await adminDb
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_reason: 'Cancelled by customer',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 6. Write to order status history
    await adminDb.from('order_status_history').insert({
      order_id: id,
      previous_status: 'placed',
      new_status: 'cancelled',
      changed_by: null, // Done by anonymous/customer
      note: 'Cancelled by customer',
    });

    // 7. Write to audit logs
    await writeAuditLog({
      event: 'order.cancelled',
      ip_address: ip,
      metadata: {
        order_id: id,
        cancelled_by: 'customer',
        reason: 'Cancelled by customer',
      },
    });

    // 8. Send SMS confirmation
    const shortId = order.sequential_id ? `DHB-${String(order.sequential_id).padStart(4, '0')}` : `#${order.id.slice(0, 8)}`;
    const smsMessage = `Your IPL Dhaba order ${shortId} has been successfully cancelled. We hope to serve you again soon! 🏏`;
    await sendSMS(order.phone, smsMessage);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[API Cancel Order] error:', err.message);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
