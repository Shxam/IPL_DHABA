'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertOctagon } from 'lucide-react';
import Navbar from '@/components/shared/navbar';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an analytics or error tracking service
    console.error('[Global Error Boundary Catch]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-16 relative">
      <Navbar />

      <main className="max-w-md mx-auto px-4 w-full mt-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Cricket/Rain Delay theme visual */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-md">
            <span className="text-5xl">🌧️</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-saffron text-white p-1.5 rounded-full border-2 border-white shadow-md">
            <AlertOctagon size={18} />
          </div>
        </div>

        {/* Headline */}
        <h2 className="font-display font-extrabold text-ink text-2xl tracking-wide uppercase">
          Rain Delay!
        </h2>
        <span className="text-xs font-bold text-saffron tracking-widest uppercase mt-1">
          Technical Interruption
        </span>

        <p className="text-xs text-muted leading-relaxed mt-4 max-w-sm">
          Even the best batsmen face a tricky delivery! The game is temporarily paused due to an unexpected technical glitch.
        </p>

        {/* Display specific error details in a safe collapsed box if available */}
        {error.message && (
          <div className="w-full mt-6 bg-red-50/50 border border-red-200/50 rounded-lg p-3 text-left">
            <span className="text-[10px] text-red-800 font-extrabold uppercase tracking-wide block mb-1">Umpire Decision / Error Log</span>
            <code className="text-[11px] font-mono text-red-700 break-all leading-normal block">
              {error.message || 'Unknown runtime error'}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-8">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 bg-saffron hover:bg-saffron/90 text-white font-bold rounded-lg shadow-premium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            <span>Try Again / Refresh</span>
          </button>

          <Link
            href="/"
            className="flex-1 py-3 bg-white hover:bg-cream border border-border text-ink font-bold rounded-lg shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Home size={14} />
            <span>Go to Menu</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
