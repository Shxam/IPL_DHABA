import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { decryptOTP } from '@/lib/utils';
import { writeAuditLog } from '@/services/audit';
import { sendSMS } from '@/services/sms';
import { sendOrderStatusUpdateEmail } from '@/services/email';

const completeOrderSchema = z.object({
  cashCollected: z.number().optional().nullable(),
  discrepancyReason: z.string().optional().nullable(),
  proofType: z.enum(['photo', 'otp']),
  proofPhotoUrl: z.string().optional().nullable(),
  deliveryOtp: z.string().optional().nullable(),
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
    // 2. Fetch user's role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    if (!['owner', 'admin', 'super_admin', 'manager', 'delivery'].includes(role)) {
      return NextResponse.json({ error: 'Access denied: staff only' }, { status: 403 });
    }

    // 3. Fetch order
    const { data: order, error: fetchError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If role is delivery driver, ensure order is assigned to them
    if (role === 'delivery' && order.assigned_driver_id !== user.id) {
      return NextResponse.json({ error: 'Access denied: order not assigned to you' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = completeOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { cashCollected, discrepancyReason, proofType, proofPhotoUrl, deliveryOtp } = parseResult.data;

    // 4. Validate COD Cash collected if payment method is COD
    let updatedCashCollected = null;
    let updatedDiscrepancyReason = null;

    if (order.payment_method === 'cod') {
      if (cashCollected === undefined || cashCollected === null) {
        return NextResponse.json({ error: 'Cash collected amount is required' }, { status: 400 });
      }
      const totalAmount = Number(order.total_amount);
      const diff = Math.abs(Number(cashCollected) - totalAmount);
      if (diff > 1) {
        if (!discrepancyReason || !discrepancyReason.trim()) {
          return NextResponse.json({
            error: `Collected cash ₹${cashCollected} differs from total ₹${totalAmount}. Please provide a discrepancy reason.`,
          }, { status: 400 });
        }
        updatedDiscrepancyReason = discrepancyReason.trim();
      }
      updatedCashCollected = cashCollected;
    }

    // 5. Verify Delivery Proof
    if (proofType === 'otp') {
      if (!deliveryOtp) {
        return NextResponse.json({ error: 'Verification PIN is required' }, { status: 400 });
      }
      if (!order.delivery_otp || !order.delivery_otp_expires_at) {
        return NextResponse.json({ error: 'No delivery OTP PIN has been set for this order' }, { status: 400 });
      }
      const decryptedPin = decryptOTP(order.delivery_otp);
      if (decryptedPin !== deliveryOtp.trim()) {
        return NextResponse.json({ error: 'Invalid delivery PIN code' }, { status: 400 });
      }
      if (new Date() > new Date(order.delivery_otp_expires_at)) {
        return NextResponse.json({ error: 'Delivery PIN code has expired' }, { status: 400 });
      }
    } else if (proofType === 'photo') {
      if (!proofPhotoUrl || !proofPhotoUrl.trim()) {
        return NextResponse.json({ error: 'Doorstep proof photo is required' }, { status: 400 });
      }
    }

    // 6. Update order status to delivered
    const updateData = {
      status: 'delivered' as const,
      delivered_at: new Date().toISOString(),
      cash_collected: updatedCashCollected,
      cash_discrepancy_reason: updatedDiscrepancyReason,
      delivery_proof_photo_url: proofType === 'photo' ? proofPhotoUrl : null,
    };

    const { data: updatedOrder, error: updateError } = await adminDb
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 7. Write to order status history
    await adminDb.from('order_status_history').insert({
      order_id: id,
      previous_status: order.status,
      new_status: 'delivered',
      changed_by: user.id,
      note: `Proof verified via ${proofType}`,
    });

    // 8. Write to audit logs
    await writeAuditLog({
      event: 'order.status_changed',
      user_id: user.id,
      ip_address: ip,
      metadata: {
        order_id: id,
        previous_status: order.status,
        new_status: 'delivered',
        proof_type: proofType,
        cash_collected: updatedCashCollected,
        discrepancy_reason: updatedDiscrepancyReason,
      },
    });

    // 9. Send SMS/Email updates (non-blocking)
    const shortId = order.sequential_id ? `DHB-${String(order.sequential_id).padStart(4, '0')}` : `#${order.id.slice(0, 8)}`;
    const smsMessage = `Your IPL Dhaba order ${shortId} has been successfully delivered! Thank you for ordering. 🏏`;
    if (order.phone) {
      await sendSMS(order.phone, smsMessage);
    }

    sendOrderStatusUpdateEmail(updatedOrder, 'delivered').catch((e) =>
      console.error('[API Driver Complete] Invoice email error:', e.message)
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[API Driver Complete] error:', err.message);
    return NextResponse.json({ error: 'Failed to complete order delivery' }, { status: 500 });
  }
}
