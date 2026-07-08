-- =============================================================================
-- IPL Dhaba — Consolidated Database Schema (Unified Initial Schema)
-- =============================================================================

-- ── 1. EXTENSIONS ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. ENUM TYPES ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_type AS ENUM ('cod', 'online');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_type AS ENUM ('pending', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. TABLES ────────────────────────────────────────────────────────────────

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  emoji       TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  image_url    TEXT,
  food_type    TEXT DEFAULT 'veg' CHECK (food_type IN ('veg', 'non_veg', 'egg')),
  is_available BOOLEAN DEFAULT true,
  is_featured  BOOLEAN DEFAULT false,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (category_id, name)
);

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'delivery', 'manager', 'admin', 'super_admin', 'owner')),
  avatar_url  TEXT,
  active      BOOLEAN DEFAULT true,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- STAFF INVITES
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('delivery', 'manager', 'admin', 'super_admin', 'owner')),
  invited_by UUID REFERENCES public.profiles(id),
  token      UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          BIGSERIAL UNIQUE,
  sequential_id         BIGINT,
  customer_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tracking_token        TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  customer_name         TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  delivery_address      JSONB NOT NULL,
  delivery_instructions TEXT,
  subtotal              NUMERIC(10,2) NOT NULL,
  delivery_fee          NUMERIC(10,2) DEFAULT 30,
  total_amount          NUMERIC(10,2) NOT NULL,
  status                public.order_status DEFAULT 'placed',
  payment_method        public.payment_method_type DEFAULT 'cod',
  payment_status        public.payment_status_type DEFAULT 'pending',
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  phone_verified        BOOLEAN DEFAULT false,
  location_type         TEXT DEFAULT 'pin_confirmed',
  cash_collected         NUMERIC,
  cash_discrepancy_reason TEXT,
  delivery_proof_photo_url TEXT,
  delivery_otp           TEXT,
  delivery_otp_expires_at TIMESTAMPTZ,
  assigned_driver_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason       TEXT,
  push_subscription     JSONB,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_tracking   ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_driver     ON public.orders(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status     ON public.orders(status, created_at DESC);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) NOT NULL
);

-- ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  previous_status public.order_status,
  new_status      public.order_status NOT NULL,
  changed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- DELIVERY TRACKING
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  driver_id  UUID REFERENCES public.profiles(id),
  status     TEXT NOT NULL,
  latitude   NUMERIC(10,7),
  longitude  NUMERIC(10,7),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event      TEXT NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ORDER STATUS TRANSITIONS
CREATE TABLE IF NOT EXISTS public.order_status_transitions (
  from_status public.order_status NOT NULL,
  to_status   public.order_status NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.order_status_transitions (from_status, to_status, allowed_roles) VALUES
  ('placed','confirmed', array['manager','admin','super_admin','owner']),
  ('placed','cancelled', array['manager','admin','super_admin','owner','customer']),
  ('confirmed','preparing', array['manager','admin','super_admin','owner']),
  ('confirmed','cancelled', array['manager','admin','super_admin','owner']),
  ('preparing','out_for_delivery', array['manager','admin','super_admin','owner']),
  ('out_for_delivery','delivered', array['delivery','manager','admin','super_admin','owner'])
ON CONFLICT (from_status, to_status) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles;

-- OTPS
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

-- ── 4. FUNCTIONS & TRIGGERS ──────────────────────────────────────────────────

-- Sync auth.users -> public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_invite record;
BEGIN
  SELECT * INTO matched_invite
  FROM public.staff_invites
  WHERE lower(email) = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      matched_invite.role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Guest User'),
      NEW.phone
    );

    UPDATE public.staff_invites SET used_at = now() WHERE id = matched_invite.id;
  ELSE
    INSERT INTO public.profiles (id, email, role, full_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      'customer',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Guest User'),
      NEW.phone
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent direct role self-update
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() <> 'service_role'
     AND coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' THEN
    RAISE EXCEPTION 'Role changes must go through admin_set_role()';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_update();

-- Admin set role
CREATE OR REPLACE FUNCTION public.admin_set_role(user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('admin','super_admin','owner') THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role.';
  END IF;

  IF new_role NOT IN ('customer','delivery','manager','admin','super_admin','owner') THEN
    RAISE EXCEPTION 'Invalid role specified.';
  END IF;

  IF new_role IN ('admin','super_admin','owner') AND caller_role NOT IN ('super_admin','owner') THEN
    RAISE EXCEPTION 'Only super_admin or owner may grant that role.';
  END IF;

  PERFORM set_config('app.allow_role_change', 'true', true);
  UPDATE public.profiles SET role = new_role WHERE id = user_id;

  INSERT INTO public.audit_logs (user_id, event, ip_address, metadata)
  VALUES (
    auth.uid(),
    'role_change',
    '127.0.0.1',
    jsonb_build_object('target_user_id', user_id, 'new_role', new_role)
  );
END;
$$;

-- current_user_role helper
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- Backfill sequential_id trigger on insert for orders
CREATE OR REPLACE FUNCTION public.set_order_sequential_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.sequential_id := NEW.order_number;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_sequential_id ON public.orders;
CREATE TRIGGER trg_set_order_sequential_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_sequential_id();

-- ── 5. ROW-LEVEL SECURITY POLICIES ───────────────────────────────────────────

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public categories are viewable by everyone"
  ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories manage by admin staff"
  ON public.categories FOR ALL TO authenticated
  USING (public.current_user_role() IN ('manager', 'admin', 'super_admin', 'owner'));

-- MENU ITEMS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public menu items are viewable by everyone"
  ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Menu items manage by admin staff"
  ON public.menu_items FOR ALL TO authenticated
  USING (public.current_user_role() IN ('manager', 'admin', 'super_admin', 'owner'));

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile and staff can view profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner')
  );
CREATE POLICY "Profiles updated by owner and admin"
  ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'super_admin', 'owner'));

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users/Admins can select orders"
  ON public.orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner')
  );
CREATE POLICY "Admins can update orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner'));
CREATE POLICY "Anonymous user can insert orders"
  ON public.orders FOR INSERT WITH CHECK (true);

-- ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users/Admins can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.customer_id = auth.uid()
        OR public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner')
      )
    )
  );
CREATE POLICY "Anonymous user can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (true);

-- DELIVERY TRACKING
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders and admin can manage tracking"
  ON public.delivery_tracking FOR ALL TO authenticated
  USING (public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner'));
CREATE POLICY "Everyone can read tracking status"
  ON public.delivery_tracking FOR SELECT USING (true);

-- STAFF INVITES
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_invites_admin_only"
  ON public.staff_invites FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin', 'owner'));

-- AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin', 'owner'));
CREATE POLICY "audit_insert_only"
  ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;
REVOKE UPDATE, DELETE ON public.order_status_history FROM authenticated, anon, public;

-- OTPS
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
-- No client-side policies for OTPS. Handled exclusively by service-role adminDb backend.

-- PUSH SUBSCRIPTIONS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own subscriptions"
  ON public.push_subscriptions FOR ALL 
  USING (user_id = auth.uid());

-- Realtime publication enablement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'delivery_tracking'
  ) THEN
    -- Ensure publication exists or create/alter it safely
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
    END IF;
  END IF;
END $$;
