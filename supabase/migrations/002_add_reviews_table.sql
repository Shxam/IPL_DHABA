-- =============================================================================
-- IPL Dhaba — Create Reviews Table and RLS Policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating                INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment               TEXT,
  google_review_clicked BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 1. Insert Policy: Customers can insert reviews for their own orders if the order is delivered
DROP POLICY IF EXISTS "Users can insert reviews for own delivered orders" ON public.reviews;
CREATE POLICY "Users can insert reviews for own delivered orders"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)
      AND o.status = 'delivered'
    )
  );

-- 2. Update Policy: Customers can update their own reviews (e.g., set google_review_clicked = true)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)
    )
  );

-- 3. Select Policy: Customers can view their own reviews, and staff/admin can view all
DROP POLICY IF EXISTS "Users can view own reviews and staff can view all" ON public.reviews;
CREATE POLICY "Users can view own reviews and staff can view all"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id
      AND (o.customer_id = auth.uid() OR o.customer_id IS NULL)
    )
    OR public.current_user_role() IN ('delivery', 'manager', 'admin', 'super_admin', 'owner')
  );
