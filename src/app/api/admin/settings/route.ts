import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';

const settingsUpdateSchema = z.object({
  is_open: z.boolean().optional(),
  opening_hours: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format'),
    timezone: z.string().default('Asia/Kolkata'),
  }).optional(),
});

export async function POST(request: NextRequest) {
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
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Access denied: owners only' }, { status: 403 });
    }

    // 3. Parse input
    const body = await request.json();
    const parseResult = settingsUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { is_open, opening_hours } = parseResult.data;

    // 4. Update settings in DB
    if (is_open !== undefined) {
      const { error } = await adminDb
        .from('restaurant_settings')
        .upsert({
          key: 'is_open',
          value: is_open,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;

      // Log setting toggled
      await writeAuditLog({
        event: 'restaurant.open_closed.toggled',
        user_id: user.id,
        ip_address: ip,
        metadata: { is_open },
      });
    }

    if (opening_hours !== undefined) {
      const { error } = await adminDb
        .from('restaurant_settings')
        .upsert({
          key: 'opening_hours',
          value: opening_hours,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Admin Settings] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
