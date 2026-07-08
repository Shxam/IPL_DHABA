'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogIn, ShieldAlert, ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useUserStore } from '@/store/use-user-store';

export default function SessionExpiredPage() {
  const { logout } = useUserStore();

  // Clear local user store state on mount to ensure clean state
  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      {/* Return to menu link */}
      <Link href="/" className="text-muted hover:text-saffron text-xs font-bold flex items-center gap-1 mb-6">
        <ChevronLeft size={14} />
        Back to Dhaba Menu
      </Link>

      <Card className="w-full max-w-md shadow-premium border-border bg-surface text-center">
        <CardHeader className="pb-4 flex flex-col items-center">
          {/* Cricket Ball / Caught Out Visual */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-4xl shadow-inner border border-red-100">
              🔴
            </div>
            <div className="absolute -bottom-2 -right-2 bg-saffron text-white p-1.5 rounded-full border-2 border-white shadow-md">
              <ShieldAlert size={16} />
            </div>
          </div>
          <CardTitle className="text-xl font-black font-display text-cancelled uppercase tracking-wide">
            Caught Out!
          </CardTitle>
          <CardDescription className="text-xs text-muted font-bold tracking-widest uppercase mt-0.5 text-saffron">
            Session Expired
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-xs text-muted leading-relaxed max-w-xs">
            Your login session has timed out or is no longer valid. For security and to protect order processing queues, we automatically sign you out after inactivity.
          </p>

          <Link href="/admin/login" className="w-full mt-2">
            <button className="w-full py-3 bg-charcoal hover:bg-charcoal/90 text-white font-bold text-xs rounded-lg shadow-premium flex items-center justify-center gap-2 transition-all">
              <LogIn size={14} />
              <span>Log Back In</span>
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
