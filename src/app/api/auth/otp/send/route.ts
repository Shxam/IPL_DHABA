import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/redis';

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = sendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be 10 digits.' },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;

    // 1. Sliding Window Rate Limiting (Max 3 OTP sends per 10 minutes)
    const rateLimitKey = `rate_limit:otp_send:${phone}`;
    const limitCheck = await rateLimit(rateLimitKey, 3, 600);

    if (!limitCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before requesting another OTP.' },
        { status: 429 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const isProductionTwilio = accountSid && authToken && serviceSid;

    if (isProductionTwilio) {
      // 2. Production: Use Twilio Verify Service
      const client = twilio(accountSid, authToken);
      await client.verify.v2
        .services(serviceSid)
        .verifications.create({ to: `+91${phone}`, channel: 'sms' });

      console.log(`[Twilio Verify] Verification SMS sent to +91${phone}`);
    } else {
      // 3. Local Development Fallback: Generate and log code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(otpCode).digest('hex');

      const adminDb = createAdminClient();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

      // Insert record in otps table
      const { error: dbError } = await adminDb.from('otps').insert({
        phone,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempt_count: 0,
        verified: false,
      });

      if (dbError) throw dbError;

      console.warn(`\n=== [DEV OTP] SMS code for +91${phone} is: ${otpCode} (Expires in 5 minutes) ===\n`);
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err: any) {
    console.error('[API Send OTP] Error:', err.message);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
