import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/services/audit';

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  role: z.enum(['owner', 'admin', 'super_admin', 'manager', 'delivery']),
  vehicleType: z.string().optional().nullable(), // Bike, Scooter, Cycle, Car
  avatarUrl: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').default('IPLdhaba123!'),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Authenticate and check if owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Access denied: owners only' }, { status: 403 });
    }

    // 2. Fetch all staff accounts (role is not customer)
    const adminDb = createAdminClient();
    const { data: staff, error } = await adminDb
      .from('profiles')
      .select('*')
      .neq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Admin Team] DB select failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ staff });
  } catch (err: any) {
    console.error('[API Admin Team] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const parseResult = createStaffSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid staff details', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { name, email, phone, role, vehicleType, avatarUrl, password } = parseResult.data;

    // 3. Create user in auth.users using adminDb
    const { data: authUser, error: authError } = await adminDb.auth.admin.createUser({
      email,
      phone: phone || undefined,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: name,
        role,
      },
    });

    if (authError || !authUser.user) {
      console.error('[API Admin Team] Auth createUser failed:', authError?.message);
      return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const newUserId = authUser.user.id;

    // 4. Update the public.profiles record
    // Drivers default to 'pending_approval', others are active
    const status = role === 'delivery' ? 'pending_approval' : 'active';

    const { error: profileError } = await adminDb
      .from('profiles')
      .update({
        full_name: name,
        phone,
        role,
        vehicle_type: vehicleType || null,
        avatar_url: avatarUrl || null,
        status,
        active: true,
      })
      .eq('id', newUserId);

    if (profileError) {
      console.error('[API Admin Team] Profile update failed:', profileError.message);
      // Clean up created user in auth if profile sync fails
      await adminDb.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Failed to update profile record' }, { status: 500 });
    }

    // 5. Write audit logs
    if (role === 'delivery') {
      await writeAuditLog({
        event: 'driver.account.created',
        user_id: currentUser.id,
        ip_address: ip,
        metadata: {
          driver_id: newUserId,
          driver_name: name,
          vehicle_type: vehicleType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email,
        full_name: name,
        role,
        status,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[API Admin Team] POST error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
