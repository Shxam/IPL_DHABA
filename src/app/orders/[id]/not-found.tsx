'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, ShieldAlert } from 'lucide-react';
import Navbar from '@/components/shared/navbar';

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pb-16 relative">
      <Navbar />

      <main className="max-w-md mx-auto px-4 w-full mt-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Cricket Themed Stumps / Error Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-500 shadow-md">
            <span className="text-5xl">🏏</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-saffron text-white p-1.5 rounded-full border-2 border-zinc-950 shadow-sm">
            <ShieldAlert size={18} />
          </div>
        </div>

        {/* Clean Bowled Headline */}
        <h2 className="font-display font-black text-white text-2xl tracking-wide uppercase">
          Clean Bowled!
        </h2>
        <span className="text-xs font-bold text-saffron tracking-widest uppercase mt-1">
          Order Receipt Not Found
        </span>

        <p className="text-xs text-zinc-300 leading-relaxed mt-4 max-w-sm">
          We couldn&apos;t trace the order you are looking for. It might have been entered incorrectly, or could be associated with a different session.
        </p>

        {/* Info Box */}
        <div className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-md mt-6 flex flex-col gap-2.5 text-left text-xs">
          <span className="font-extrabold text-white uppercase tracking-wide">How to recover your order:</span>
          <ul className="list-disc list-inside text-zinc-400 flex flex-col gap-1 font-medium">
            <li>Verify the tracking link sent to your phone via SMS.</li>
            <li>Look up your complete order history in the <strong className="text-saffron">My Orders</strong> tab.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full mt-8">
          <Link
            href="/my-orders"
            className="w-full py-3 bg-saffron hover:bg-saffron-hover text-white font-extrabold rounded-xl shadow-saffron text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
          >
            <Search size={14} />
            <span>Look Up in My Orders</span>
          </Link>

          <Link
            href="/"
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider"
          >
            <ChevronLeft size={14} className="text-saffron" />
            <span className="text-white">Return to Dhaba Menu</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
