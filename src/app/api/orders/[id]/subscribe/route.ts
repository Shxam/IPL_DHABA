import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { subscription } = body;

    const adminDb = createAdminClient();

    const { error } = await adminDb
      .from('orders')
      .update({
        push_subscription: subscription,
      })
      .eq('id', id);

    if (error) {
      console.error('[API Order Subscribe] DB update failed:', error.message);
      return NextResponse.json({ error: 'Failed to update push subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Order Subscribe] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
