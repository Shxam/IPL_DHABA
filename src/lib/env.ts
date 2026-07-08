import { z } from 'zod';

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY must be configured'),
  SUPABASE_ANON_KEY: z.string().min(10, 'SUPABASE_ANON_KEY must be configured'),
  RESEND_API_KEY: z.string().min(5, 'RESEND_API_KEY must be configured'),
  RESTAURANT_EMAIL: z.string().email().default('owner@ipldhaba.com'),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured'),
});

export function validateEnv() {
  if (typeof window === 'undefined') {
    // Validate server environment variables
    const parseResult = serverEnvSchema.safeParse({
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESTAURANT_EMAIL: process.env.RESTAURANT_EMAIL,
    });

    if (!parseResult.success) {
      console.error('[Env] Server environment validation failed:', parseResult.error.format());
      throw new Error('Missing or invalid server environment variables.');
    }
  } else {
    // Validate client environment variables
    const parseResult = clientEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    if (!parseResult.success) {
      console.error('[Env] Client environment validation failed:', parseResult.error.format());
      throw new Error('Missing or invalid client environment variables.');
    }
  }
}
