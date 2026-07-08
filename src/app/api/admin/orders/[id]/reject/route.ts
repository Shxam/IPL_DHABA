import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';
import { sendSMS } from '@/services/sms';
import { sendOrderStatusUpdateEmail } from '@/services/email';

const rejectOrderSchema = z.object({
  reason: z.string().min(2, 'Reason must be provided'),
});

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

  try {
    // 2. Fetch role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    if (!['owner', 'admin', 'super_admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    // 3. Parse reject reason
    const body = await request.json();
    const parseResult = rejectOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { reason } = parseResult.data;

    // 4. Fetch order
    const { data: order, error: fetchError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'placed') {
      return NextResponse.json({ error: 'Only pending (placed) orders can be rejected' }, { status: 400 });
    }

    // 5. Update status and rejection reason
    const { data: updatedOrder, error: updateError } = await adminDb
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 6. Write order status history
    await adminDb.from('order_status_history').insert({
      order_id: id,
      previous_status: 'placed',
      new_status: 'rejected',
      changed_by: user.id,
      note: `Rejected: ${reason}`,
    });

    // 7. Write audit log
    await writeAuditLog({
      event: 'order.rejected',
      user_id: user.id,
      ip_address: ip,
      metadata: {
        order_id: id,
        reason,
      },
    });

    // 8. Send SMS notification
    const shortId = order.sequential_id ? `DHB-${String(order.sequential_id).padStart(4, '0')}` : `#${order.id.slice(0, 8)}`;
    const smsMessage = `Your IPL Dhaba order ${shortId} could not be processed. Reason: ${reason}. Sorry for the inconvenience!`;
    if (order.phone) {
      await sendSMS(order.phone, smsMessage);
    }

    // 9. Send email status update (non-blocking)
    sendOrderStatusUpdateEmail(updatedOrder, 'cancelled').catch((e) =>
      console.error('[API Admin Reject] Email notify error:', e.message)
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[API Admin Reject] error:', err.message);
    return NextResponse.json({ error: 'Failed to reject order' }, { status: 500 });
  }
}
