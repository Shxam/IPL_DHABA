import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

const syncCartSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(z.any()),
  updatedAt: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const adminDb = createAdminClient();

  try {
    const { data: cart, error } = await adminDb
      .from('anonymous_carts')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      console.error('[API Cart Sync] DB select failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    return NextResponse.json({ cart: cart || null });
  } catch (err: any) {
    console.error('[API Cart Sync] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminDb = createAdminClient();

  try {
    const body = await request.json();
    const parseResult = syncCartSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid sync payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, items, updatedAt } = parseResult.data;

    const { error } = await adminDb
      .from('anonymous_carts')
      .upsert({
        session_id: sessionId,
        items,
        updated_at: updatedAt || new Date().toISOString(),
      });

    if (error) {
      console.error('[API Cart Sync] DB upsert failed:', error.message);
      return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Cart Sync] POST error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
