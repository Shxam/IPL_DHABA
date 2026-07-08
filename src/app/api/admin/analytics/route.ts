import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // 2. Validate role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    if (role !== 'admin' && role !== 'manager' && role !== 'super_admin' && role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .gte('created_at', todayStart.toISOString());

    if (todayError) throw todayError;

    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const pendingOrders = todayOrders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status)
    ).length;
    const deliveredToday = todayOrders.filter((o) => o.status === 'delivered').length;

    // Fetch weekly orders (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekOrders, error: weekError } = await supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', weekStart.toISOString())
      .not('status', 'eq', 'cancelled');

    if (weekError) throw weekError;

    // Group by day of week
    const weeklyRevenue: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      weeklyRevenue[key] = 0;
    }

    (weekOrders || []).forEach((o) => {
      const key = o.created_at.split('T')[0];
      if (weeklyRevenue[key] !== undefined) {
        weeklyRevenue[key] += parseFloat(o.total_amount || 0);
      }
    });

    return NextResponse.json({
      today: { totalOrders, totalRevenue, pendingOrders, deliveredToday },
      weeklyRevenue: Object.entries(weeklyRevenue).map(([date, revenue]) => ({ date, revenue })),
    });
  } catch (err: any) {
    console.error('[API Admin Analytics] Error:', err.message);
    return NextResponse.json({ error: 'Failed to calculate analytics data' }, { status: 500 });
  }
}
