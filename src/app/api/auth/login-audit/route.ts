import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeAuditLog } from '@/services/audit';

const auditSchema = z.object({
  email: z.string().email(),
  success: z.boolean(),
  userId: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    const body = await request.json();
    const parseResult = auditSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { email, success, userId } = parseResult.data;

    if (success) {
      await writeAuditLog({
        event: 'admin.login.success',
        user_id: userId || null,
        ip_address: ip,
        metadata: { email },
      });
    } else {
      await writeAuditLog({
        event: 'admin.login.failure',
        user_id: null,
        ip_address: ip,
        metadata: { email },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Login Audit] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
