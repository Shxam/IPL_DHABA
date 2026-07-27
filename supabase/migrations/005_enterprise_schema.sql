    -- ============================================================
    -- EXTENSIONS
    -- ============================================================
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_cron";

    -- ============================================================
    -- ENUMS
    -- ============================================================
    -- Add new values to existing order_status enum
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'accepted';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'assigned_driver';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'picked_up';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed';

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cod', 'online');
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE staff_role AS ENUM ('kitchen_staff', 'delivery_manager', 'delivery');
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event') THEN
        CREATE TYPE audit_event AS ENUM (
        'login_success', 'login_failed', 'logout',
        'order_placed', 'order_status_changed', 'order_rejected', 'order_refunded',
        'menu_item_toggled', 'staff_created', 'staff_deleted',
        'rate_limit_hit', 'otp_sent', 'otp_verified', 'otp_failed',
        'file_uploaded', 'rls_bypass_attempt'
        );
    END IF;
    END$$;

    -- ============================================================
    -- IDEMPOTENCY KEYS
    -- Prevents duplicate order submissions on network retry
    -- ============================================================
    CREATE TABLE IF NOT EXISTS idempotency_keys (
    key         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
    );
    CREATE INDEX IF NOT EXISTS idx_idem_expires ON idempotency_keys(expires_at);

    -- ============================================================
    -- OTP STORE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS otps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT NOT NULL,
    code_hash       TEXT NOT NULL,       -- bcrypt hash of the 6-digit code
    attempt_count   SMALLINT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,         -- set after 5 failed attempts
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otps(phone, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_otp_phone_window ON otps(phone, created_at)
    WHERE created_at > NOW() - INTERVAL '15 minutes';

    -- ============================================================
    -- PERSISTENT CARTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS carts (
    session_id    TEXT PRIMARY KEY,
    items         JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cart_updated ON carts(updated_at);

    -- ============================================================
    -- INVENTORY
    -- ============================================================
    CREATE TABLE IF NOT EXISTS inventory (
    menu_item_id        UUID PRIMARY KEY REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id),
    delta           INTEGER NOT NULL,       -- positive = restock, negative = sold/reserved
    reason          TEXT,
    order_id        UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- ORDER SCHEMA ADDITIONS
    -- Add columns to existing orders table
    -- ============================================================
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS idempotency_key   UUID UNIQUE REFERENCES idempotency_keys(key),
    ADD COLUMN IF NOT EXISTS invoice_number    TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS tracking_token    UUID UNIQUE DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS delivery_lat      NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS delivery_lng      NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS proof_photo_url   TEXT,
    ADD COLUMN IF NOT EXISTS proof_code        CHAR(4),
    ADD COLUMN IF NOT EXISTS proof_code_valid  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cod_amount_collected NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ;  -- soft delete

    CREATE INDEX IF NOT EXISTS idx_orders_tracking   ON orders(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_orders_driver      ON orders(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status, created_at DESC);

    -- Add foreign key constraint for idempotency keys
    ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_order_id_fkey;
    ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

    -- ============================================================
    -- INVOICE SEQUENCE (GST-compliant sequential numbering)
    -- ============================================================
    CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

    CREATE OR REPLACE FUNCTION next_invoice_number() RETURNS TEXT
    LANGUAGE plpgsql AS $$
    DECLARE
    fy TEXT;
    seq_val BIGINT;
    BEGIN
    -- Financial year in India: April-March, formatted as YYMM short codes
    fy := TO_CHAR(
        CASE WHEN EXTRACT(MONTH FROM NOW()) >= 4 THEN NOW() ELSE NOW() - INTERVAL '1 year' END,
        'YY'
    ) || TO_CHAR(
        CASE WHEN EXTRACT(MONTH FROM NOW()) >= 4 THEN NOW() + INTERVAL '1 year' ELSE NOW() END,
        'YY'
    );
    seq_val := NEXTVAL('invoice_seq');
    RETURN 'INV-' || fy || '-' || LPAD(seq_val::TEXT, 5, '0');
    END;
    $$;

    -- Trigger: auto-assign invoice number when order is marked delivered
    CREATE OR REPLACE FUNCTION assign_invoice_number() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
    BEGIN
    IF NEW.status = 'delivered' AND OLD.status <> 'delivered' AND NEW.invoice_number IS NULL THEN
        NEW.invoice_number := next_invoice_number();
    END IF;
    RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_assign_invoice ON orders;
    CREATE TRIGGER trg_assign_invoice
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION assign_invoice_number();

    -- ============================================================
    -- ORDER STATUS HISTORY
    -- ============================================================
    CREATE TABLE IF NOT EXISTS order_status_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status  TEXT,
    to_status    TEXT NOT NULL,
    actor_id     UUID REFERENCES auth.users(id),  -- who triggered the change
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_osh_order ON order_status_history(order_id, created_at);

    -- ============================================================
    -- PAYMENTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    method              payment_method NOT NULL,
    status              payment_status NOT NULL DEFAULT 'pending',
    amount              NUMERIC(10,2) NOT NULL,
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    razorpay_refund_id  TEXT,
    gateway_response    JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);

    CREATE TABLE IF NOT EXISTS payment_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id   UUID NOT NULL REFERENCES payments(id),
    event_type   TEXT NOT NULL,
    payload      JSONB NOT NULL,
    processed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- OUTBOX (transactional email/SMS retry queue)
    -- ============================================================
    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_type') THEN
        CREATE TYPE outbox_type AS ENUM ('email', 'sms');
    END IF;
    END$$;

    DO $$
    BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_status') THEN
        CREATE TYPE outbox_status AS ENUM ('pending', 'sent', 'failed', 'dead');
    END IF;
    END$$;

    CREATE TABLE IF NOT EXISTS outbox (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          outbox_type NOT NULL,
    recipient     TEXT NOT NULL,        -- email address or phone number
    subject       TEXT,                 -- email only
    body          TEXT NOT NULL,
    metadata      JSONB,                -- order_id, invoice_number, etc.
    status        outbox_status NOT NULL DEFAULT 'pending',
    attempt_count SMALLINT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error    TEXT,
    sent_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(next_retry_at) WHERE status = 'pending';

    -- ============================================================
    -- ESCALATION TRACKING (server-side, not browser timers)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS order_escalations (
    order_id        UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    level_5min_sent BOOLEAN NOT NULL DEFAULT FALSE,
    level_10min_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- STAFF INVITATIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS staff_invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    role        staff_role NOT NULL,
    token_hash  TEXT NOT NULL,         -- bcrypt hash of the invite token
    accepted    BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    created_by  UUID NOT NULL REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- ROLES & PERMISSIONS (RBAC)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS roles (
    id    SERIAL PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
    );
    INSERT INTO roles (name) VALUES
    ('owner'), ('kitchen_staff'), ('delivery_manager'), ('delivery')
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS user_roles (
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id   INTEGER NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
    );

    -- ============================================================
    -- DELIVERY PROOF CODES
    -- 4-digit code bound to order, server-generated, expires on delivery
    -- ============================================================
    CREATE TABLE IF NOT EXISTS delivery_proof_codes (
    order_id    UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    code        CHAR(4) NOT NULL,       -- plaintext is acceptable (short-lived, non-sensitive)
    valid       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- AUDIT LOGS (INSERT-only — RLS enforced below)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event      audit_event NOT NULL,
    actor_id   UUID REFERENCES auth.users(id),
    target_id  TEXT,                    -- order ID, menu item ID, etc.
    ip_address INET,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_id, created_at DESC);

    -- ============================================================
    -- ROW-LEVEL SECURITY POLICIES
    -- ============================================================

    -- Audit logs: INSERT-only for all authenticated users. No UPDATE or DELETE ever.
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS audit_insert_only ON audit_logs;
    CREATE POLICY audit_insert_only ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);
    -- No SELECT, UPDATE, or DELETE policy = denied by default.
    -- Owner reads via a service-role Supabase Edge Function.

    -- Orders: customers see only their own (via session). Drivers see only assigned.
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS orders_driver_select ON orders;
    CREATE POLICY orders_driver_select ON orders
    FOR SELECT TO authenticated
    USING (
        assigned_driver_id = auth.uid()
        OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('owner', 'kitchen_staff', 'delivery_manager')
        )
    );

    -- Carts: session-scoped, enforced at API layer (anon users with session cookie)
    -- No RLS on carts — access controlled via API middleware session validation only.

    -- Inventory: read-only for kitchen staff, write via service role only
    ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS inventory_read ON inventory;
    CREATE POLICY inventory_read ON inventory
    FOR SELECT TO authenticated USING (TRUE);

    -- Delivery proof codes: only the assigned driver and owner can read
    ALTER TABLE delivery_proof_codes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS proof_driver_read ON delivery_proof_codes;
    CREATE POLICY proof_driver_read ON delivery_proof_codes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_id
        AND (
            o.assigned_driver_id = auth.uid()
            OR EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid() AND r.name = 'owner'
            )
        )
        )
    );

    -- ============================================================
    -- OTP Nonces Table
    -- ============================================================
    CREATE TABLE IF NOT EXISTS otp_nonces (
    nonce      UUID PRIMARY KEY,
    phone      TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_otp_nonces_expires ON otp_nonces(expires_at);

    SELECT '005_enterprise_schema applied successfully' AS result;
