'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, ShieldAlert } from 'lucide-react';
import Navbar from '@/components/shared/navbar';

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-16 relative">
      <Navbar />

      <main className="max-w-md mx-auto px-4 w-full mt-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Cricket Themed Stumps / Error Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-md">
            <span className="text-5xl">🏏</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-saffron text-white p-1.5 rounded-full border-2 border-white shadow-sm">
            <ShieldAlert size={18} />
          </div>
        </div>

        {/* Clean Bowled Headline */}
        <h2 className="font-display font-extrabold text-ink text-2xl tracking-wide uppercase">
          Clean Bowled!
        </h2>
        <span className="text-xs font-bold text-saffron tracking-widest uppercase mt-1">
          Order Receipt Not Found
        </span>

        <p className="text-xs text-muted leading-relaxed mt-4 max-w-sm">
          We couldn&apos;t trace the order you are looking for. It might have been entered incorrectly, or could be associated with a different session.
        </p>

        {/* Info Box */}
        <div className="w-full bg-surface border border-border p-4 rounded-lg shadow-sm mt-6 flex flex-col gap-2.5 text-left text-xs">
          <span className="font-bold text-ink uppercase tracking-wide">How to recover your order:</span>
          <ul className="list-disc list-inside text-muted flex flex-col gap-1">
            <li>Verify the tracking link sent to your phone via SMS.</li>
            <li>Look up your complete order history in the <strong className="text-saffron">My Orders</strong> tab.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full mt-8">
          <Link
            href="/my-orders"
            className="w-full py-3 bg-ink hover:bg-ink/90 text-white font-bold rounded-lg shadow-premium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Search size={14} />
            <span>Look Up in My Orders</span>
          </Link>

          <Link
            href="/"
            className="w-full py-3 bg-white hover:bg-cream border border-border text-ink font-bold rounded-lg shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <ChevronLeft size={14} />
            <span>Return to Dhaba Menu</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
