# APK-2
app link=https://ipl-dhaba-app-4ape.vercel.app/
This is the APK-2 Next.js project (fork/variation of the create-next-app template).

A modern web app built with Next.js (App Router), TypeScript and Supabase (Postgres) as the backend.

## Architecture

Below is an architecture diagram for APK-2. The repo references the image at `public/architecture.png` — add the provided diagram image to that path so it appears inline in GitHub.

![APK-2 architecture diagram: Client, Edge/CDN, Application, Database, Cache, Queue, Observability, CI/CD layers](./public/architecture.png)

The diagram represents the following layers tailored for APK-2:

- Client Layer
  - Next.js PWA — mobile-first, offline-capable, performance-focused
- Edge / CDN Layer
  - Vercel Edge Network (global CDN) — image optimization, edge functions
- Application Layer
  - Next.js 14 App Router
  - Server Components, API routes, server actions, RSC streaming
- Integrations
  - OTP / SMS: Twilio (or alternative) for OTP verification
  - Email: transactional email (Resend, React Email)
  - Push Notifications: Web Push with VAPID keys
  - Maps: Mapbox GL (delivery / tracking)
- Database Layer
  - Supabase (PostgreSQL): RLS, RBAC, realtime websockets, pgvector for future search
  - Connection pooling via Supavisor / PgBouncer
- Cache Layer
  - Upstash Redis (serverless) for sessions, rate limiting, cart
- Queue / Jobs
  - Upstash OStash (or alternative) for order events, retries
- Observability
  - Error tracking: Sentry (frontend + API)
  - Analytics: PostHog (self-hosted) — funnels & session recording
  - Uptime & logs: BetterStack for alerts and log drain
- CI / CD
  - GitHub Actions + Vercel — preview deployments, Lighthouse CI, DB migration checks on PRs


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
