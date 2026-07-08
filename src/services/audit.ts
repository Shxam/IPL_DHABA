import { createAdminClient } from '@/lib/supabase/server';

export interface AuditLogOptions {
  event:
    | 'order.placed'
    | 'order.status_changed'
    | 'order.rejected'
    | 'order.cancelled'
    | 'order.escalated'
    | 'admin.login.success'
    | 'admin.login.failure'
    | 'menu.item.toggled'
    | 'driver.account.created'
    | 'driver.account.deactivated'
    | 'restaurant.open_closed.toggled'
    | 'rate_limit.hit'
    | 'otp.sent'
    | 'otp.verified'
    | 'otp.failed';
  user_id?: string | null;
  ip_address: string;
  metadata?: Record<string, any>;
}

export async function writeAuditLog({
  event,
  user_id = null,
  ip_address,
  metadata = {},
}: AuditLogOptions): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { error } = await adminDb.from('audit_logs').insert({
      event,
      user_id: user_id || null,
      ip_address: ip_address || '127.0.0.1',
      metadata,
    });

    if (error) {
      console.error('[Audit Service] Error writing audit log:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Audit Service] Exception writing audit log:', err.message);
    return false;
  }
}
