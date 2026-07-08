import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';
import { sendSMS } from '@/services/sms';

const assignDriverSchema = z.object({
  driverId: z.string().uuid('Invalid driver ID format'),
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

    // 3. Parse driver ID
    const body = await request.json();
    const parseResult = assignDriverSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { driverId } = parseResult.data;

    // 4. Fetch driver profile to verify and get phone number
    const { data: driver, error: driverError } = await adminDb
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.role !== 'delivery') {
      return NextResponse.json({ error: 'Selected user is not a delivery driver' }, { status: 400 });
    }

    // 5. Fetch order
    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 6. Update order with driver ID
    const { data: updatedOrder, error: updateError } = await adminDb
      .from('orders')
      .update({
        assigned_driver_id: driverId,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 7. Write to audit logs
    await writeAuditLog({
      event: 'order.status_changed',
      user_id: user.id,
      ip_address: ip,
      metadata: {
        order_id: id,
        assigned_driver_id: driverId,
        driver_name: driver.full_name,
      },
    });

    // 8. Send SMS to driver
    const shortId = order.sequential_id ? `DHB-${String(order.sequential_id).padStart(4, '0')}` : `#${order.id.slice(0, 8)}`;
    const addressLine = order.delivery_address?.address_line || 'your address';
    const driverMessage = `New delivery assigned: Order ${shortId} to ${addressLine}. Open app to navigate. 🏏`;
    if (driver.phone) {
      await sendSMS(driver.phone, driverMessage);
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[API Admin Assign] error:', err.message);
    return NextResponse.json({ error: 'Failed to assign driver' }, { status: 500 });
  }
}
