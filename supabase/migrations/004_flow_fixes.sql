-- =============================================================================
-- IPL Dhaba — Flow Fixes Migration (v2.0)
-- Run AFTER 001_schema.sql, 002_rls.sql, 003_next_auth_schema.sql
-- =============================================================================

-- ── 1. ADD 'rejected' TO ORDER STATUS ENUM ───────────────────────────────────
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';

-- ── 2. ALIGN PROFILES ROLE CONSTRAINT ────────────────────────────────────────
-- The role names used in the app are:
--   owner, kitchen_staff, delivery_manager, delivery, customer
-- Migration 003 created the profiles table with a different set of roles.
-- We drop the old constraint and replace it with the correct one.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update any existing rows that used old role names to their equivalents
UPDATE public.profiles SET role = 'owner'            WHERE role = 'super_admin';
UPDATE public.profiles SET role = 'owner'            WHERE role = 'admin';
UPDATE public.profiles SET role = 'delivery_manager' WHERE role = 'manager';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('owner', 'kitchen_staff', 'delivery_manager', 'delivery', 'customer'));

-- Add extra driver/staff columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active';

-- ── 3. PHONE VERIFICATIONS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  phone             TEXT PRIMARY KEY,
  otp               TEXT NOT NULL,
  verified          BOOLEAN DEFAULT false NOT NULL,
  attempts          INTEGER DEFAULT 0 NOT NULL,
  blacklisted_until TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.phone_verifications;
CREATE POLICY "service role only" ON public.phone_verifications
  USING (auth.role() = 'service_role');

-- ── 4. RESTAURANT SETTINGS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner read-write" ON public.restaurant_settings;
CREATE POLICY "owner read-write" ON public.restaurant_settings
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  ));

DROP POLICY IF EXISTS "public read" ON public.restaurant_settings;
CREATE POLICY "public read" ON public.restaurant_settings
  FOR SELECT USING (true);

-- ── 5. ANONYMOUS CARTS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anonymous_carts (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anonymous_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session owner only" ON public.anonymous_carts;
CREATE POLICY "session owner only" ON public.anonymous_carts
  USING (true); -- enforced at API layer via session cookie

-- ── 6. ORDER STATUS HISTORY — SAFE RECREATE ──────────────────────────────────
-- 003_next_auth_schema.sql created this with typed columns (public.order_status).
-- We drop and recreate with TEXT columns so 'rejected' works without re-casting.
DROP TABLE IF EXISTS public.order_status_history CASCADE;

CREATE TABLE public.order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ DEFAULT now(),
  note            TEXT
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read order history"
  ON public.order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'kitchen_staff', 'delivery_manager')
  ));

CREATE POLICY "service role insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── 7. AUDIT LOGS — SAFE RECREATE ────────────────────────────────────────────
-- 003_next_auth_schema.sql created audit_logs with different columns.
-- We drop and recreate with the v2 schema (event + metadata pattern).
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event      TEXT NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner only" ON public.audit_logs;
CREATE POLICY "owner only" ON public.audit_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  ));

DROP POLICY IF EXISTS "service role insert" ON public.audit_logs;
CREATE POLICY "service role insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── 8. PUSH SUBSCRIPTIONS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role push subs" ON public.push_subscriptions;
CREATE POLICY "service role push subs" ON public.push_subscriptions
  USING (auth.role() = 'service_role');

-- ── 9. NEW COLUMNS ON ORDERS ─────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sequential_id            BIGINT,
  ADD COLUMN IF NOT EXISTS phone_verified           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_type            TEXT DEFAULT 'pin_confirmed',
  ADD COLUMN IF NOT EXISTS cash_collected           NUMERIC,
  ADD COLUMN IF NOT EXISTS cash_discrepancy_reason  TEXT,
  ADD COLUMN IF NOT EXISTS delivery_proof_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS delivery_otp             TEXT,
  ADD COLUMN IF NOT EXISTS delivery_otp_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_driver_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason         TEXT,
  ADD COLUMN IF NOT EXISTS push_subscription        JSONB;

-- Backfill sequential_id using order_number (already a BIGSERIAL)
UPDATE public.orders SET sequential_id = order_number WHERE sequential_id IS NULL;

-- ── 10. DB-LEVEL INPUT CONSTRAINTS ON ORDERS ─────────────────────────────────
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_length;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_name_length;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_address_length CHECK (char_length(delivery_address::text) <= 500),
  ADD CONSTRAINT orders_name_length    CHECK (char_length(customer_name) <= 500);

-- ── 11. ADD REALTIME FOR NEW TABLES ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
  END IF;
END
$$;

SELECT '004_flow_fixes applied successfully' AS result;
