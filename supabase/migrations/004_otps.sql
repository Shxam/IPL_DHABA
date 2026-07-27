-- =============================================================================
-- IPL Dhaba — Create OTPs Table (Tracked Migration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.otps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  attempt_count SMALLINT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- Note: No SELECT, INSERT, or UPDATE policies are created for public or authenticated roles.
-- This restricts all direct client-side Supabase SDK access.
-- The Next.js API routes will interact with this table securely using the Service Role admin client (adminDb).
