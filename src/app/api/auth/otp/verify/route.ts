import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/redis';

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit number'),
  code: z.string().regex(/^\d{6}$/, 'Code must be a 6-digit number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid phone or code format.' },
        { status: 400 }
      );
    }

    const { phone, code } = parseResult.data;

    // 1. Rate limit verification attempts (Max 5 attempts per 10 minutes)
    const rateLimitKey = `rate_limit:otp_verify:${phone}`;
    const limitCheck = await rateLimit(rateLimitKey, 5, 600);

    if (!limitCheck.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const isProductionTwilio = accountSid && authToken && serviceSid;
    let verified = false;

    if (isProductionTwilio) {
      // 2a. Production: Use Twilio Verify Checks API
      const client = twilio(accountSid, authToken);
      const verificationCheck = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: `+91${phone}`, code });

      verified = verificationCheck.status === 'approved';
    } else {
      // 2b. Local Dev Fallback: Check OTP stored in database
      const adminDb = createAdminClient();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      // Find a matching, unexpired, unverified OTP for this phone
      const { data: otpRecord, error: otpError } = await adminDb
        .from('otps')
        .select('*')
        .eq('phone', phone)
        .eq('code_hash', codeHash)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpRecord) {
        return NextResponse.json(
          { error: 'Invalid or expired OTP code.' },
          { status: 401 }
        );
      }

      // Check attempt count
      if (otpRecord.attempt_count >= 5) {
        return NextResponse.json(
          { error: 'Maximum OTP verification attempts exceeded.' },
          { status: 429 }
        );
      }

      // Increment attempt count
      await adminDb
        .from('otps')
        .update({ attempt_count: otpRecord.attempt_count + 1 })
        .eq('id', otpRecord.id);

      // Mark as verified
      await adminDb
        .from('otps')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      verified = true;
      console.log(`[DEV OTP] Verification approved for +91${phone}`);
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid OTP code. Please check and try again.' },
        { status: 401 }
      );
    }

    // 3. Upsert user profile after successful verification
    const adminDb = createAdminClient();

    // Check if profile exists for this phone number
    const { data: existingProfile } = await adminDb
      .from('profiles')
      .select('id, phone, full_name, role')
      .eq('phone', phone)
      .single();

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully.',
        user: existingProfile,
      });
    }

    // If no profile exists yet, return success with phone; the frontend
    // can prompt for name on first order or create profile lazily
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully. Profile will be created on first order.',
      user: { phone, role: 'customer' },
    });
  } catch (err: any) {
    console.error('[API Verify OTP] Error:', err.message);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
