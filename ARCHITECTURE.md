# ARCHITECTURE.md — IPL Dhaba Restaurant Ordering App
**Version:** 1.2 | Stack: 100% Free-Tier Production

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Next.js 16 Web App                   │   │
│  │            (Customer UI + Staff / Admin Panel)           │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS / WSS (Supabase Realtime)
┌─────────────────────────────┼───────────────────────────────────┐
│                      NEXT.JS BACKEND LAYER                      │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │             API Routes (TypeScript, `@supabase/ssr`)     │   │
│  │   /api/orders  /api/menu  /api/auth  /api/jobs/*         │   │
│  │   Rate Limiting (Upstash Redis)                          │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                           SUPABASE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  PostgreSQL  │  │  Auth (JWT)  │  │  Storage (Images)  │     │
│  │  (Schema)    │  │  + RLS       │  │  Supabase CDN      │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐      │
│  │          Realtime (WebSocket channels)                  │      │
│  │  channel: order-{orderId}                               │      │
│  └────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐
       │   Resend   │  │    Sentry   │  │   Vercel   │
       │  (Email)   │  │  (Errors)   │  │  (Hosting) │
       └────────────┘  └─────────────┘  └────────────┘
```

---

## 2. Tech Stack (100% Free-Tier)

| Layer | Technology | Version / Free Tier |
|---|---|---|
| **Web App** | Next.js (App Router) + React | Next.js 16.2.10 + React 18 |
| **Styling** | Tailwind CSS + CSS variables | Open source |
| **State Management** | Zustand (Cart / Order status) | Open source |
| **Forms + Validation** | React Hook Form + Zod | Open source |
| **Database** | Supabase PostgreSQL | 500MB, 50K MAU |
| **Auth** | Supabase Auth (email OTP / session refresh) | Included |
| **File Storage** | Supabase Storage | 1GB |
| **Real-time** | Supabase Realtime (WebSockets) | 200 concurrent |
| **Rate Limiting** | Upstash Redis | 10,000 requests/day |
| **Background Jobs** | Upstash QStash (async webhook dispatch) | 500 messages/day |
| **Maps** | Mapbox GL Web SDK + OpenStreetMap | Mapbox Free Tier / Leaflet fallback |
| **Email** | Resend | 3,000 / month |
| **Error Tracking** | Sentry | 5K events / month |
| **Web Hosting** | Vercel | 100GB bandwidth |

---

## 3. Directory Structure

The codebase is structured as a unified, full-stack Next.js project:

```
APP/
├── public/                     # Static assets, pwa manifest, sw.js (PWA service worker)
├── src/
│   ├── app/                    # Next.js App Router Pages & API Endpoints
│   │   ├── admin/              # Staff/Admin interface (Dashboard, Delivery list)
│   │   ├── api/                # Next.js API Routes (Serverless Endpoints)
│   │   │   ├── admin/          # Analytics & Audit Logs (Admin only)
│   │   │   ├── auth/           # OTP Sign in / Verification
│   │   │   ├── jobs/           # QStash Background Webhook Handlers
│   │   │   ├── menu/           # Menu fetch / Cache invalidation
│   │   │   └── orders/         # Order creation, details, and status updates
│   │   ├── orders/             # Customer order tracking page
│   │   ├── layout.tsx          # Global providers (React Query, PostHog) & HTML skeleton
│   │   └── page.tsx            # Customer Home page / Interactive Menu
│   ├── components/             # Reusable UI React Components
│   │   ├── admin/              # Admin stats and cards
│   │   ├── customer/           # Cart drawer, menu items, search
│   │   └── orders/             # Tracking Map, Status Timeline
│   ├── hooks/                  # Custom React hooks (e.g. useDeliveryLocation)
│   ├── lib/                    # Library configs (redis, jobs, webpush, supabase server/client)
│   ├── providers/              # React Query context provider
│   ├── services/               # Resend Email template compilers & senders
│   ├── types/                  # Shared TypeScript models
│   ├── middleware.ts           # Route guards, Rate Limiting, OWASP Security Headers
│   └── instrumentation.ts      # Sentry telemetry registration
├── supabase/
│   ├── migrations/             # SQL Migrations (001 to 008)
│   └── seed.sql                # Initial menu seed data
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript compiler config
```

---

## 4. Database Schema

### 4.1 SQL Schema Highlights

#### Staff Invites (`staff_invites`)
Manages staff membership invites. During signup (`handle_new_user`), the system checks if the registrant's email matches a valid, unexpired token in this table to assign their role.
```sql
CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('delivery','manager','admin','super_admin','owner')),
  invited_by uuid REFERENCES public.profiles(id),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### Order Status Transitions (`order_status_transitions`)
Defines the allowed transitions of the order state machine and controls which roles can execute them.
```sql
CREATE TABLE public.order_status_transitions (
  from_status public.order_status NOT NULL,
  to_status public.order_status NOT NULL,
  allowed_roles text[] NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
```

#### Orders (`orders`)
Added `tracking_token` for secure anonymous checkout tracking.
```sql
CREATE TABLE public.orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          SERIAL UNIQUE,
  customer_id           UUID REFERENCES profiles(id),
  status                order_status DEFAULT 'placed',
  subtotal              NUMERIC(10,2) NOT NULL,
  delivery_fee          NUMERIC(10,2) DEFAULT 30,
  total_amount          NUMERIC(10,2) NOT NULL,
  delivery_address      JSONB NOT NULL,
  delivery_instructions TEXT,
  payment_method        payment_method DEFAULT 'cod',
  payment_status        payment_status DEFAULT 'pending',
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  assigned_delivery_id  UUID REFERENCES profiles(id),
  tracking_token        TEXT NOT NULL UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Row-Level Security Policies

Hardened RLS policies ensure data containment:
* **Profiles (`profiles`)**: Select is restricted. Users can view their own profile, and staff (`delivery`, `manager`, `admin`, `super_admin`, `owner`) can search profiles to support admin dashboards.
* **Orders (`orders`)**: Select is restricted. Users can only select their own orders. Staff can select all orders. Anonymous users access order tracking via a token-validated API endpoint.
* **Order Items (`order_items`)**: Restricted. Select only allowed if the parent order exists in `orders`.
* **Audit Logs (`audit_logs`)** & **Order Status History (`order_status_history`)**: Read-only for admins. Hardened by revoking `UPDATE` and `DELETE` privileges for all roles (including owner).

---

## 5. Security & Business Logic Hardening

1. **Pricing Verification**: Cart submissions bypass client-side pricing variables. The client only sends `menu_item_id` and `quantity`. Subtotals, delivery fees, and total amounts are calculated server-side based on prices queried directly from the Supabase database.
2. **Minimum Order Amount**: The backend enforces a minimum subtotal threshold of **Rs. 100** before an order is placed.
3. **Role change lockdown**: Direct updates to `profiles.role` are blocked by a PostgreSQL trigger. Role adjustments must go through `admin_set_role()`, which enforces caller restrictions (only `super_admin`/`owner` can grant administrative roles) and logs audit events.
4. **Anonymous Tracking**: Guest checkouts generate a cryptographically secure 32-byte `tracking_token`. Guest order tracking pages (`/orders/[id]?token=...`) mandate this token. Direct database reads of orders on client-side bypass RLS via this server-managed endpoint.
5. **Rate Limiting**: Rate limiting is handled in Next.js middleware using Upstash Redis. It limits clients to **120 requests/minute**. In production, it fails closed if Redis is unreachable; in development, it degrades gracefully to maintain convenience.

---

## 6. Realtime / Polling Architecture

1. **Realtime Channels**: Clients subscribe to order events using Supabase Realtime channels:
   * `order-{orderId}`: Real-time update channel for order status.
   * `tracking-{orderId}`: Active coordinates update for delivery agent markers.
2. **Synchronized Mapbox Viewport**: In `src/components/orders/tracking-map.tsx`, the Mapbox wrapper uses a coordinate-based `key` (`key={`${centerCoords[0]}:${centerCoords[1]}`}`) to force component updates when the delivery agent location updates. This resolves viewport tracking synchronization lag.

---

## 7. Email Notification Pipeline (Resend)

Dynamic emails are dispatched asynchronously via QStash:
* **Receipts & Order Alerts**: Emails escape all dynamic strings (`escapeHtml`) to prevent injection.
* **Tracking Links**: Real-time tracking URLs automatically append the `tracking_token` parameter (`?token=...`) so that users can track orders directly without logging in.

---

## 8. Deployment Architecture

* **Hosting**: Hosted on **Vercel** as a full-stack Next.js project.
* **Database & Auth**: Hosted on **Supabase** (PostgreSQL, Auth, Storage).
* **Cache & Rate Limits**: **Upstash Redis** REST API.
* **Background Jobs**: **Upstash QStash** triggers webhook endpoints asynchronously (e.g., `/api/jobs/order-created`).
* **Environment Variables**:
  * `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  * `SUPABASE_SERVICE_ROLE_KEY` (Server-only database bypass)
  * `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
  * `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
  * `RESEND_API_KEY`
  * `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`