import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendSMS } from '@/services/sms';
import { writeAuditLog } from '@/services/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const supabase = await createClient();
  const adminDb = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 2. Fetch role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'customer';
  if (!['owner', 'admin', 'super_admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Access denied: staff only' }, { status: 403 });
  }

  try {
    // 1. Fetch order
    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Verify order is still 'placed'
    if (order.status !== 'placed') {
      return NextResponse.json({ error: 'Order is already acknowledged or processed' }, { status: 400 });
    }

    // 3. Find owner profile to get registered phone number
    const { data: owner } = await adminDb
      .from('profiles')
      .select('phone')
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();

    // If owner phone is not found, fallback to RESTAURANT_EMAIL or default number
    const ownerPhone = owner?.phone || '+919876543210';

    // 4. Send SMS to owner
    const shortId = order.sequential_id ? `DHB-${String(order.sequential_id).padStart(4, '0')}` : `#${order.id.slice(0, 8)}`;
    const smsMessage = `⚠️ IPL Dhaba: Order ${shortId} has been waiting for 10 minutes. Please review the dashboard. 🏏`;
    await sendSMS(ownerPhone, smsMessage);

    // 5. Write to audit logs
    await writeAuditLog({
      event: 'order.escalated',
      ip_address: ip,
      metadata: {
        order_id: id,
        owner_phone: ownerPhone,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Escalate] error:', err.message);
    return NextResponse.json({ error: 'Failed to escalate order' }, { status: 500 });
  }
}
