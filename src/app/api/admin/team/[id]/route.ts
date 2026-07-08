import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';

const editStaffSchema = z.object({
  active: z.boolean().optional(),
  status: z.enum(['active', 'pending_approval', 'deactivated']).optional(),
  role: z.enum(['owner', 'admin', 'super_admin', 'manager', 'delivery']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const supabase = await createClient();
  const adminDb = createAdminClient();

  // 1. Check owner authentication
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (currentProfile?.role !== 'owner') {
      return NextResponse.json({ error: 'Access denied: owners only' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const parseResult = editStaffSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { active, status, role } = parseResult.data;

    // Fetch existing profile to check previous state and role
    const { data: targetProfile, error: selectError } = await adminDb
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (selectError || !targetProfile) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // 3. Build update object
    const updateData: Record<string, any> = {};
    if (active !== undefined) updateData.active = active;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;

    const { data: updatedProfile, error: updateError } = await adminDb
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[API Admin Team Edit] DB update failed:', updateError.message);
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
    }

    // 4. Log audit log events for drivers
    if (targetProfile.role === 'delivery') {
      if (active === false && targetProfile.active !== false) {
        await writeAuditLog({
          event: 'driver.account.deactivated',
          user_id: currentUser.id,
          ip_address: ip,
          metadata: {
            driver_id: id,
            driver_name: targetProfile.full_name,
          },
        });
      }
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    console.error('[API Admin Team Edit] PATCH error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
