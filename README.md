# IPL Dhaba 🏏 — Premium Realtime Food Delivery Platform

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-success?style=flat&logo=vercel)](https://ipl-dhaba-app-4ape.vercel.app/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2014-blue?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-emerald?style=flat&logo=supabase)](https://supabase.com/)

A premium, mobile-first, and highly aesthetic food delivery application custom-built for **IPL Dhaba** (Singarayakonda, AP, India). Features realtime WebSocket order tracking, custom role-based access controls, Mapbox routing, Twilio OTP verification, and a smart Google Review feedback redirection funnel.

👉 **Live App**: [https://ipl-dhaba-app-4ape.vercel.app/](https://ipl-dhaba-app-4ape.vercel.app/)

---

## 📸 System Architecture

![IPL Dhaba Architecture](./public/architecture.png)

The application utilizes a modern, edge-optimized multi-layered infrastructure:
* **Client Layer**: Mobile-first responsive PWA built with Next.js & Tailwind CSS.
* **Edge CDN**: Vercel Global Edge Network for optimized image delivery and edge routing middleware.
* **Application Services**: Next.js 14 App Router with React Server Components (RSC) and Server Actions.
* **Database (Supabase)**: Row-Level Security (RLS), custom DB Roles (RBAC), and realtime PostgreSQL websocket channels.
* **Caching & Jobs**: Upstash Redis (rate limiting & session caching) + Upstash QStash (background queue jobs).
* **Integrations**: Twilio (SMS OTP), Resend (Transactional emails), Mapbox (doorstep pinning & rider tracking).

---

## 🚀 Key Features

### 🛒 Customer Ordering Experience
* **Category Filtering**: Fast navigation across dishes with real-time availability sync.
* **Dynamic Cart Drawer**: Step-by-step quantity selectors, minimum order validations, and custom delivery instructions.
* **Doorstep Pinning Map**: Dual Mapbox/Leaflet integration allowing users to click/drag a pin to specify their exact delivery coordinates.

### 📍 Live Order Tracking & Review Funnel
* **Realtime Timelines**: Active websocket connection updating the customer instantly as status changes (`placed`, `preparing`, `shipped`, `delivered`).
* **Live Rider Tracking**: Bouncing bike marker mapping the agent's real-time movement to the customer's doorstep.
* **Google Review Funnel**:
  * Delivers a **Rate Your Experience** prompt upon delivery.
  * **4-5 Stars**: Prompts the user to leave a review on Google Maps (opens in a new tab) and saves click telemetry.
  * **1-3 Stars**: Collects constructive private feedback inside the database for internal improvement.

### 🛡️ Staff & Admin Portal
* **Role-Based Routing**: Auto-redirects staff based on custom database roles (`owner`, `manager`, `delivery`).
* **Owner Dashboard**: Revenue graphs, team role management, security audit logs, and instant menu item toggles.
* **Rider Console**: Clean job list allowing drivers to accept orders, open map routing, and mark items completed.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, React Query.
* **Backend Database**: Supabase PostgreSQL with connection pooling.
* **Caching**: Upstash Serverless Redis.
* **Maps**: Mapbox GL (Primary) & OpenStreetMap/Leaflet (Fallback).
* **Security**: OWASP compliance headers (CSP, HSTS), local-development rate limit bypass, and RLS policies.

---

## 💻 Local Development Setup

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/Shxam/IPL_DHABA.git
cd IPL_DHABA
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Supabase Database Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3005

# Caching & Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Background Jobs (Upstash QStash)
QSTASH_URL=your-qstash-url
QSTASH_CURRENT_SIGNING_KEY=your-key
QSTASH_NEXT_SIGNING_KEY=your-key

# Twilio OTP SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_VERIFY_SERVICE_SID=your-verify-sid

# Mapbox API
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token

# Review Funnel & Contact Info
NEXT_PUBLIC_GOOGLE_REVIEW_URL=https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID
NEXT_PUBLIC_CONTACT_PHONE=+91 99999 99999
NEXT_PUBLIC_CONTACT_EMAIL=support@ipldhaba.com
```

### 3. Initialize the Database Schema
1. Open your Supabase project's **SQL Editor**.
2. Run the unified schema migration script in **`supabase/migrations/001_initial_schema.sql`** to build the core tables and triggers.
3. Run the seed data script in **`supabase/seed.sql`** to populate categories and menu items.
4. Run the reviews migration script in **`supabase/migrations/002_add_reviews_table.sql`** to activate the review funnel.

### 4. Start the Server
```bash
npm run dev -p 3005
```
Open [http://localhost:3005](http://localhost:3005) in your browser.
