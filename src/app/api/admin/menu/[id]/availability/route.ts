import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';

const availabilitySchema = z.object({
  available: z.boolean(),
});

export async function PATCH(
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
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Access denied: owners only' }, { status: 403 });
    }

    // 3. Parse input
    const body = await request.json();
    const parseResult = availabilitySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { available } = parseResult.data;

    // 4. Update menu item in DB
    const { data: menuItem, error: updateError } = await adminDb
      .from('menu_items')
      .update({
        is_available: available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API Menu Toggle] DB update failed:', updateError.message);
      return NextResponse.json({ error: 'Menu item not found or update failed' }, { status: 404 });
    }

    // 5. Write to audit logs
    await writeAuditLog({
      event: 'menu.item.toggled',
      user_id: user.id,
      ip_address: ip,
      metadata: {
        menu_item_id: id,
        name: menuItem.name,
        is_available: available,
      },
    });

    return NextResponse.json({ success: true, menuItem });
  } catch (err: any) {
    console.error('[API Menu Toggle] error:', err.message);
    return NextResponse.json({ error: 'Failed to update menu item availability' }, { status: 500 });
  }
}
