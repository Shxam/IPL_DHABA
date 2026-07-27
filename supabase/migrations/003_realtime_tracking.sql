-- =============================================================================
-- IPL Dhaba — Real-time Delivery Location & Push Notifications Migration
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- ── 1. Create delivery_locations table ──
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id  UUID REFERENCES public.profiles(id),
  lat        NUMERIC(9,6) NOT NULL,
  lng        NUMERIC(9,6) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Enable security
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_locations
DROP POLICY IF EXISTS "customer reads own delivery location" ON public.delivery_locations;
CREATE POLICY "customer reads own delivery location"
  ON public.delivery_locations FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "driver writes own location" ON public.delivery_locations;
CREATE POLICY "driver writes own location"
  ON public.delivery_locations FOR INSERT
  WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "driver updates own location" ON public.delivery_locations;
CREATE POLICY "driver updates own location"
  ON public.delivery_locations FOR UPDATE
  USING (driver_id = auth.uid());


-- ── 2. Recreate push_subscriptions table ──
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS: Enable security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user manages own subscriptions" ON public.push_subscriptions;
CREATE POLICY "user manages own subscriptions"
  ON public.push_subscriptions FOR ALL 
  USING (user_id = auth.uid());


-- ── 3. Enable Supabase Realtime publication ──
-- Check if table is already in the publication before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'delivery_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_locations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'push_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
  END IF;
END $$;

SELECT '003_realtime_tracking migration applied successfully' as result;
