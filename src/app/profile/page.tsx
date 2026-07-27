'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import BottomNav from '@/components/shared/bottom-nav';
import { useUserStore } from '@/store/use-user-store';
import { 
  Bell, Settings, Trophy, ChevronRight, Package, 
  Heart, MapPin, CreditCard, Headphones, Bike, LogOut, ShieldAlert 
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const fanPoints = 2560;
  const nextMilestone = 3500;
  const progressPercent = Math.min(100, Math.round((fanPoints / nextMilestone) * 100));

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-800/90 backdrop-blur-lg px-6 py-3 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="IPL Dhaba Logo" 
            width={36} 
            height={36} 
            className="rounded-full shadow-sm"
          />
          <span className="font-display text-lg font-black text-saffron">IPL DHABA</span>
        </Link>

        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-saffron transition-colors">
            <Bell size={18} />
          </button>
          <button className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-saffron transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 w-full mt-6 flex-1 flex flex-col gap-6">
        
        {/* User Info Block */}
        <div className="flex items-center gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          {/* Jersey Style Photo Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-saffron to-amber-600 border-2 border-saffron flex-shrink-0 flex items-center justify-center font-black text-2xl text-white shadow-saffron relative overflow-hidden">
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center p-1">
              <span className="text-[9px] font-black tracking-tighter uppercase text-amber-300">IPL DHABA</span>
              <span className="text-2xl font-black leading-none text-white">18</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <h2 className="font-display text-xl font-black text-white">
              {user?.full_name && user.full_name !== 'Guest User' ? user.full_name : 'Rahul Sharma'}
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-saffron/15 border border-saffron/40 text-saffron px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                ★ IPL Dhaba Fan
              </span>
            </div>

            <span className="text-xs text-zinc-400 font-semibold mt-1">
              {user?.email || 'rahul.sharma@email.com'}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">
              +91 98765 43210
            </span>
          </div>
        </div>

        {/* Fan Points & Loyalty Card */}
        <div className="relative bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-saffron/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-black text-saffron uppercase tracking-widest block">
                ★ FAN POINTS ★
              </span>
              <p className="text-[11px] text-zinc-400 font-medium">
                The more you order, the higher you climb!
              </p>
            </div>

            {/* Golden Trophy Graphic */}
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-md">
              🏆
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-black text-saffron tracking-tight">{fanPoints.toLocaleString()}</span>
              <span className="text-xs font-extrabold text-zinc-400 ml-1">PTS</span>
            </div>

            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              👑 VIP Fan
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-saffron rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-extrabold text-zinc-400 block text-right mt-1">
              Next Milestone: {nextMilestone.toLocaleString()} PTS
            </span>
          </div>
        </div>

        {/* Menu Navigation List */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/my-orders"
            className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 hover:border-saffron/60 p-4 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-saffron/20 text-saffron flex items-center justify-center text-lg">
                📦
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">My Orders</h4>
                <span className="text-[10px] text-zinc-400 block">Track your orders and view history</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-saffron" />
          </Link>

          <Link
            href="/#favourites"
            className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 hover:border-saffron/60 p-4 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-lg">
                ❤️
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Favourites</h4>
                <span className="text-[10px] text-zinc-400 block">Your favourite dishes and combos</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-saffron" />
          </Link>

          <Link
            href="/#addresses"
            className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 hover:border-saffron/60 p-4 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                📍
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Saved Addresses</h4>
                <span className="text-[10px] text-zinc-400 block">Manage your delivery addresses</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-saffron" />
          </Link>

          <Link
            href="/#payments"
            className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 hover:border-saffron/60 p-4 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                💳
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Payments</h4>
                <span className="text-[10px] text-zinc-400 block">Manage payment methods &amp; wallets</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-saffron" />
          </Link>

          <Link
            href="/#settings"
            className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 hover:border-saffron/60 p-4 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg">
                ⚙️
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Settings</h4>
                <span className="text-[10px] text-zinc-400 block">Account, notifications &amp; more</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-saffron" />
          </Link>
        </div>

        {/* Promo Delivery Banner */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <Bike size={24} className="text-saffron" />
            <div>
              <h4 className="font-display text-sm font-black text-saffron uppercase">FAST DELIVERY</h4>
              <span className="text-xs text-zinc-300 font-semibold block">Great Food. On Time.</span>
            </div>
          </div>
          <Image 
            src="/logo.png" 
            alt="IPL Dhaba" 
            width={40} 
            height={40} 
            className="rounded-full shadow-md"
          />
        </div>

        {/* Help & Support Row */}
        <Link
          href="/contact"
          className="bg-zinc-900/80 border border-zinc-800 hover:border-saffron p-4 rounded-xl flex items-center justify-between text-xs font-extrabold"
        >
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-saffron" />
            <span>Help &amp; Support</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400 font-semibold">
            <span>We&apos;re here for you!</span>
            <ChevronRight size={14} className="text-saffron" />
          </div>
        </Link>

        {user && (
          <button
            onClick={handleLogout}
            className="w-full bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/40 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
