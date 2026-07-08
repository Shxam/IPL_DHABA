import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const adminDb = createAdminClient();
  const results: Record<string, any> = {};

  const tables = [
    'profiles',
    'phone_verifications',
    'restaurant_settings',
    'anonymous_carts',
    'order_status_history',
    'audit_logs',
    'orders'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await adminDb
        .from(table)
        .select('*')
        .limit(1);
      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true, sample: data };
      }
    } catch (err: any) {
      results[table] = { exists: false, error: err.message };
    }
  }

  return NextResponse.json(results);
}
