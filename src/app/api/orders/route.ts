import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { dispatchOrderCreatedJob } from '@/lib/jobs';

const MIN_ORDER_SUBTOTAL = 100;
const DELIVERY_FEE = 30;
const STAFF_ROLES = ['delivery', 'manager', 'admin', 'super_admin', 'owner'];

const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive().max(50),
});

const placeOrderSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit number'),
  delivery_address: z.object({
    address_line: z.string().min(5, 'Address must be at least 5 characters').max(500),
    city: z.string().max(100).optional(),
    pincode: z.string().regex(/^\d{6}$/).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  delivery_instructions: z.string().max(500).nullable().optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least 1 item'),
  payment_method: z.enum(['cod', 'online']).default('cod'),
}).strict();

type MenuItemRow = {
  id: string;
  name: string;
  price: number | string;
  is_available: boolean;
};

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || forwardedFor || '127.0.0.1';
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const filterStatus = searchParams.get('status') || 'all';
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  try {
    let role = 'customer';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role || 'customer';
    }

    if (!user && !STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `, { count: 'exact' });

    if (role === 'customer') {
      query = query.eq('customer_id', user!.id);
    } else if (role === 'delivery') {
      query = query.not('status', 'in', '("placed","cancelled")');
    }

    if (filterStatus === 'active') {
      query = query.not('status', 'in', '("delivered","cancelled")');
    } else if (filterStatus === 'completed') {
      query = query.eq('status', 'delivered');
    } else if (filterStatus === 'cancelled') {
      query = query.eq('status', 'cancelled');
    }

    const { data: orders, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ orders, total: count });
  } catch (err: any) {
    console.error('[API Orders] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminDb = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await request.json();
    const parseResult = placeOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;
    const menuItemIds = Array.from(new Set(validatedData.items.map((item) => item.menu_item_id)));

    const { data: menuItems, error: menuError } = await adminDb
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', menuItemIds);

    if (menuError) throw menuError;

    const menuById = new Map(
      ((menuItems as MenuItemRow[] | null) || []).map((item) => [item.id, item])
    );

    if (menuById.size !== menuItemIds.length) {
      return NextResponse.json({ error: 'One or more menu items are invalid' }, { status: 400 });
    }

    const orderItems = validatedData.items.map((item) => {
      const menuItem = menuById.get(item.menu_item_id);
      if (!menuItem || !menuItem.is_available) {
        throw new Error('Unavailable menu item selected');
      }

      const unitPrice = Number(menuItem.price);
      return {
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const calculatedSubtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    if (calculatedSubtotal < MIN_ORDER_SUBTOTAL) {
      return NextResponse.json({ error: 'Minimum order subtotal is Rs. 100' }, { status: 400 });
    }

    const totalAmount = calculatedSubtotal + DELIVERY_FEE;
    const trackingToken = crypto.randomBytes(32).toString('hex');

    const orderInsertData = {
      customer_name: validatedData.customer_name,
      phone: validatedData.phone,
      delivery_address: validatedData.delivery_address,
      delivery_instructions: validatedData.delivery_instructions || null,
      subtotal: calculatedSubtotal,
      delivery_fee: DELIVERY_FEE,
      total_amount: totalAmount,
      status: 'placed' as const,
      payment_method: validatedData.payment_method,
      payment_status: 'pending' as const,
      estimated_delivery_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      customer_id: user?.id || null,
      tracking_token: trackingToken,
    };

    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .insert(orderInsertData)
      .select('id, order_number, status, created_at, estimated_delivery_at, tracking_token')
      .single();

    if (orderError) throw orderError;

    const orderItemsInsert = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await adminDb.from('order_items').insert(orderItemsInsert);
    if (itemsError) throw itemsError;

    await adminDb.from('order_status_history').insert({
      order_id: order.id,
      previous_status: null,
      new_status: 'placed',
      changed_by: user?.id || null,
    });

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await adminDb.from('audit_logs').insert({
      user_id: user?.id || null,
      action: 'place_order',
      entity_type: 'orders',
      entity_id: order.id,
      new_data: { order_number: order.order_number, totalAmount },
      ip_address: getClientIp(request),
      user_agent: userAgent,
    });

    const completeOrderObj = {
      ...order,
      ...orderInsertData,
      order_items: orderItemsInsert,
    };
    dispatchOrderCreatedJob(order.id, completeOrderObj);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        estimated_delivery_at: order.estimated_delivery_at,
        created_at: order.created_at,
        tracking_token: order.tracking_token,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[API Orders] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
