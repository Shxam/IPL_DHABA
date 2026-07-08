import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// In-memory rate limiting map for edge runtime instances
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 120 requests per minute per IP

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();

  // 1. IP Rate Limiting (exclude static files, images, and local development)
  const isLocalDev = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || process.env.NODE_ENV === 'development';
  if (!isLocalDev && !path.startsWith('/_next') && !path.startsWith('/static') && !path.includes('.')) {
    const currentLimit = rateLimitMap.get(ip);
    if (currentLimit) {
      if (now > currentLimit.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      } else {
        currentLimit.count++;
        if (currentLimit.count > MAX_REQUESTS) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please try again later.' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  }

  // Clean rate limits map occasionally
  if (rateLimitMap.size > 2000) {
    rateLimitMap.forEach((value, key) => {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    });
  }

  // 2. Update Supabase session (refreshes authentication cookie)
  const { response, user, supabase } = await updateSession(request);

  // 3. Security Headers (OWASP Top 10 Compliance)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content-Security-Policy supporting Supabase, Leaflet maps, Mapbox maps, OpenStreetMap tiles and fonts
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://api.mapbox.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://api.mapbox.com; " +
    "img-src 'self' blob: data: https://*.supabase.co https://unpkg.com https://*.tile.openstreetmap.org https://api.mapbox.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' wss: https://*.supabase.co https://*.supabase.in https://api.mapbox.com https://*.mapbox.com; " +
    "worker-src 'self' blob:; " +
    "child-src 'self' blob:;"
  );

  // 4. Role-Based Access Control (RBAC) Route Guards
  if (path.startsWith('/admin')) {
    // Exclude the login page and session-expired page to prevent circular redirects
    if (path !== '/admin/login' && path !== '/admin/session-expired') {
      if (!user) {
        const wasLoggedIn = request.cookies.has('dhaba_was_logged_in');
        if (wasLoggedIn) {
          return NextResponse.redirect(new URL('/admin/session-expired', request.url));
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      
      // Fetch role and active status directly from public.profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, active, status')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role || 'customer';
      const active = profile?.active !== false && profile?.status !== 'deactivated';

      const roleRequired: Record<string, string[]> = {
        '/admin/analytics':  ['owner', 'super_admin', 'admin'],
        '/admin/audit-logs': ['owner', 'super_admin', 'admin'],
        '/admin/menu':       ['owner', 'super_admin', 'admin', 'manager'],
        '/admin/team':       ['owner', 'super_admin', 'admin'],
        '/admin/delivery':   ['owner', 'super_admin', 'admin', 'manager', 'delivery'],
        '/admin/dashboard':  ['owner', 'super_admin', 'admin', 'manager'],
      };

      if (!active) {
        return NextResponse.redirect(new URL('/admin/login?reason=deactivated', request.url));
      }

      // Check access permission
      let hasAccess = false;
      let matchedRoute = false;

      for (const [routePrefix, allowedRoles] of Object.entries(roleRequired)) {
        if (path.startsWith(routePrefix)) {
          matchedRoute = true;
          if (allowedRoles.includes(role)) {
            hasAccess = true;
          }
          break;
        }
      }

      // Default access for any other /admin routes if not matched in the specific table
      if (!matchedRoute) {
        if (role === 'customer') {
          return NextResponse.redirect(new URL('/', request.url));
        }
        if (role === 'delivery') {
          return NextResponse.redirect(new URL('/admin/delivery', request.url));
        }
        // Staff roles defaults to dashboard
        hasAccess = ['owner', 'super_admin', 'admin', 'manager'].includes(role);
      }

      if (!hasAccess) {
        // Redirect to a safe fallback based on role
        if (role === 'delivery') {
          return NextResponse.redirect(new URL('/admin/delivery', request.url));
        }
        if (role === 'customer') {
          return NextResponse.redirect(new URL('/', request.url));
        }
        // Redirect other staff to dashboard
        return NextResponse.redirect(new URL('/admin/dashboard?reason=unauthorized', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apply middleware to all routes except API assets or static files
    '/((?!api/menu|api/orders/[^/]+/status|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
