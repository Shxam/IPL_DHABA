import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const STAFF_ROLES = ['delivery', 'manager', 'admin', 'super_admin', 'owner'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trackingToken = request.nextUrl.searchParams.get('token');
  const supabase = await createClient();
  const adminDb = createAdminClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    let role = 'customer';

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role || 'customer';
    }

    if (!user && !trackingToken) {
      return NextResponse.json({ error: 'Tracking token required' }, { status: 401 });
    }

    let query = adminDb
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        customer_name,
        phone,
        delivery_address,
        delivery_instructions,
        subtotal,
        delivery_fee,
        total_amount,
        status,
        payment_method,
        payment_status,
        estimated_delivery_at,
        delivered_at,
        cancelled_reason,
        created_at,
        updated_at,
        order_items (*)
      `)
      .eq('id', id);

    if (!STAFF_ROLES.includes(role)) {
      if (trackingToken) {
        query = query.eq('tracking_token', trackingToken);
      } else {
        query = query.eq('customer_id', user!.id);
      }
    }

    const { data: order, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error('[API Orders] GET single order error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
  }
}
