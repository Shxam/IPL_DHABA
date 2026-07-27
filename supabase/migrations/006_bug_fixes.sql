-- =============================================================================
-- IPL Dhaba — Database Audit Bug Fixes Migration (v3.0)
-- Run AFTER 005_enterprise_schema.sql
-- =============================================================================

-- ── 1. ADD VALUE 'failed' to payment_status_type (Bug #4) ────────────────────
ALTER TYPE public.payment_status_type ADD VALUE IF NOT EXISTS 'failed';

-- ── 2. DROP INDEX idx_orders_status AND RECREATE AS COMPOSITE (Bug #5) ───────
DROP INDEX IF EXISTS public.idx_orders_status;
CREATE INDEX idx_orders_status ON public.orders(status, created_at DESC);

-- ── 3. UPDATE handle_new_user() (admin→owner + user_roles sync) (Bug #1 + #9) ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT := 'customer';
  v_role_id    INTEGER;
BEGIN
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    default_role := NEW.raw_user_meta_data->>'role';
  ELSIF NEW.email LIKE '%@ipldhaba.com' THEN
    default_role := 'owner';  -- was 'admin'; updated to match 004 constraint
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Guest User'
    ),
    NEW.phone,
    default_role,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Keep user_roles in sync so has_role() works
  SELECT id INTO v_role_id
  FROM public.roles WHERE name = default_role;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. BACKFILL user_roles FROM profiles.role (Bug #9) ───────────────────────
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = p.role
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ── 5. DROP + RECREATE order_status_history WITH ALIGNED COLUMNS (Bug #2) ────
DROP TABLE IF EXISTS public.order_status_history CASCADE;

CREATE TABLE public.order_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status   TEXT NOT NULL,
    actor_id    UUID REFERENCES auth.users(id),
    note        TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osh_order
  ON public.order_status_history(order_id, changed_at);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read order history"
  ON public.order_status_history FOR SELECT
  USING (public.has_role(auth.uid(), ARRAY['owner', 'kitchen_staff', 'delivery_manager']));

CREATE POLICY "service role insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Re-enable Supabase Realtime for order_status_history
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

-- ── 6. DROP + RECREATE audit_logs (Bug #3) ───────────────────────────────────
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event      audit_event NOT NULL,
    actor_id   UUID REFERENCES auth.users(id),
    target_id  TEXT,
    ip_address INET,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON public.audit_logs(actor_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role inserts from API route handlers
CREATE POLICY "service role insert audit"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Owner-only reads
CREATE POLICY "owner reads audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), ARRAY['owner']));

-- ── 7. DROP STALE 003 POLICIES ON ORDERS / ORDER ITEMS (Bug #6 + #7 + #8) ────
DROP POLICY IF EXISTS "Users/Admins can select orders"           ON public.orders;
DROP POLICY IF EXISTS "Customers can view history of their own orders" ON public.order_status_history;
DROP POLICY IF EXISTS "Staff can insert order status history"    ON public.order_status_history;
DROP POLICY IF EXISTS "Users/Admins can view order items"        ON public.order_items;

-- ── 8. CREATE REPLACEMENT POLICIES WITH CORRECT ROLE NAMES (Bug #6 + #8) ──────
CREATE POLICY "customers and staff select orders"
  ON public.orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), ARRAY['owner', 'kitchen_staff', 'delivery_manager', 'delivery'])
  );

CREATE POLICY "scoped order items select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR public.has_role(
               auth.uid(),
               ARRAY['owner', 'kitchen_staff', 'delivery_manager', 'delivery']
             )
        )
    )
  );

-- Direct anon order tracking policy by tracking_token (Bug #7 fallback)
CREATE POLICY "anon order tracking by token"
  ON public.orders FOR SELECT
  TO anon
  USING (
    tracking_token IS NOT NULL
    AND tracking_token = (
      COALESCE(
        current_setting('request.headers', true)::json->>'x-tracking-token',
        ''
      )
    )::uuid
  );

-- ── 9. MIGRATE PAYMENTS TO CANONICAL ENUM TYPES (Bug #13) ────────────────────
ALTER TABLE public.payments
  ALTER COLUMN method TYPE public.payment_method_type
    USING method::text::public.payment_method_type,
  ALTER COLUMN status TYPE public.payment_status_type
    USING status::text::public.payment_status_type;

-- ── 10. DROP DUPLICATE ENUM TYPES (Bug #13) ──────────────────────────────────
DROP TYPE IF EXISTS public.payment_method;
DROP TYPE IF EXISTS public.payment_status;

-- ── 11. DROP DELIVERY PROOF REDUNDANT COLUMNS ON ORDERS (Bug #10) ────────────
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS delivery_otp,
  DROP COLUMN IF EXISTS delivery_otp_expires_at,
  DROP COLUMN IF EXISTS delivery_proof_photo_url,
  DROP COLUMN IF EXISTS proof_code,
  DROP COLUMN IF EXISTS proof_code_valid;

-- ── 12. DROP PHONE_VERIFICATIONS TABLE (Bug #11) ─────────────────────────────
DROP TABLE IF EXISTS public.phone_verifications CASCADE;

-- ── 13. DROP ANONYMOUS_CARTS TABLE (Bug #12) ─────────────────────────────────
DROP TABLE IF EXISTS public.anonymous_carts CASCADE;

-- ── 14. DELETE DUPLICATE MUTTON BIRYANI FROM MENU_ITEMS (Bug #15) ─────────────
DELETE FROM public.menu_items
WHERE name = 'Mutton Biryani'
  AND category_id = '11111111-0001-0001-0001-000000000004';

SELECT '006_bug_fixes applied successfully' AS result;
