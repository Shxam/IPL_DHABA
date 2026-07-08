import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendOrderStatusUpdateEmail } from '@/services/email';
import { OrderStatus } from '@/types';
import { encryptOTP } from '@/lib/utils';
import { sendSMS } from '@/services/sms';

const statusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
  cancelled_reason: z.string().nullable().optional(),
});

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || forwardedFor || '127.0.0.1';
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const adminDb = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Get caller's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    const allowedRoles = ['delivery', 'manager', 'admin', 'super_admin', 'owner'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = statusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { status, cancelled_reason } = parseResult.data;

    // Get current order status
    const { data: currentOrder, error: fetchError } = await adminDb
      .from('orders')
      .select('status, customer_name, phone, sequential_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const prevStatus = currentOrder.status as OrderStatus;

    // Validate state transition using public.order_status_transitions
    const { data: transition, error: transError } = await adminDb
      .from('order_status_transitions')
      .select('allowed_roles')
      .eq('from_status', prevStatus)
      .eq('to_status', status)
      .single();

    if (transError || !transition) {
      return NextResponse.json(
        { error: `Invalid status transition from ${prevStatus} to ${status}.` },
        { status: 400 }
      );
    }

    if (!transition.allowed_roles.includes(role)) {
      return NextResponse.json(
        { error: `Role ${role} is not authorized to transition order from ${prevStatus} to ${status}.` },
        { status: 403 }
      );
    }

    // Update order status
    const updateData: Record<string, any> = { status };
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }
    if (status === 'cancelled' && cancelled_reason) {
      updateData.cancelled_reason = cancelled_reason;
    }
    if (status === 'out_for_delivery') {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      updateData.delivery_otp = encryptOTP(pin);
      updateData.delivery_otp_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const shortId = currentOrder.sequential_id ? `DHB-${String(currentOrder.sequential_id).padStart(4, '0')}` : `#${id.slice(0, 8)}`;
      const smsMessage = `Your IPL Dhaba order ${shortId} is out for delivery! Give the delivery partner this verification PIN: ${pin} to receive your order. 🏏`;
      if (currentOrder.phone) {
        sendSMS(currentOrder.phone, smsMessage).catch((e) =>
          console.error('[API Order Status] SMS send failure:', e.message)
        );
      }
    }

    const { data: order, error: updateError } = await adminDb
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log to order status history
    await adminDb.from('order_status_history').insert({
      order_id: id,
      previous_status: prevStatus,
      new_status: status,
      changed_by: user.id,
    });

    // Log to audit logs
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await adminDb.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_order_status',
      entity_type: 'orders',
      entity_id: id,
      old_data: { status: prevStatus },
      new_data: { status, cancelled_reason: cancelled_reason || null },
      ip_address: ip,
      user_agent: userAgent,
    });

    // Send transactional status notification emails (non-blocking)
    sendOrderStatusUpdateEmail(order, status).catch((e) =>
      console.error('[API Order Status] Email send failure:', e.message)
    );

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('[API Order Status] Error:', err.message);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
