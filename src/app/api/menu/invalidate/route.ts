import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invalidateCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Validate role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'customer';
    const allowedRoles = ['manager', 'admin', 'super_admin', 'owner'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. Invalidate cache
    await invalidateCache('cache:menu');
    return NextResponse.json({ success: true, message: 'Menu cache invalidated successfully' });
  } catch (error: any) {
    console.error('[API Menu Invalidate] Error:', error.message);
    return NextResponse.json({ error: 'Failed to invalidate cache' }, { status: 500 });
  }
}
