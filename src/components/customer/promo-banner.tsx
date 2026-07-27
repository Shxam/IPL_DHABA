'use client';

import React from 'react';
import { Bike, Radio, ShieldCheck } from 'lucide-react';

export const PromoBanner: React.FC = () => {
  return (
    <div className="relative w-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/90 rounded-2xl p-6 shadow-2xl overflow-hidden my-6">
      
      {/* Background Graphic Accent Overlay */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-radial from-saffron/30 to-transparent" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Title & Copy */}
        <div className="max-w-md">
          <h2 className="font-display text-2xl sm:text-3xl font-black italic tracking-wide text-saffron drop-shadow-sm uppercase">
            CRICKET. FOOD. EMOTIONS.
          </h2>
          <p className="text-sm sm:text-base font-bold text-white mt-1">
            Great Matches Deserve Great Food!
          </p>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Order your favorite starters &amp; biryani while catching live match scores!
          </p>
        </div>

        {/* Feature Highlights Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 shadow-md">
            <Bike size={16} className="text-saffron" />
            <div>
              <span className="text-[10px] font-extrabold text-zinc-300 uppercase block tracking-wider">FAST</span>
              <span className="text-xs font-black text-white">DELIVERY</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 shadow-md">
            <Radio size={16} className="text-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] font-extrabold text-zinc-300 uppercase block tracking-wider">LIVE MATCH</span>
              <span className="text-xs font-black text-white">UPDATES</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 shadow-md">
            <ShieldCheck size={16} className="text-amber-400" />
            <div>
              <span className="text-[10px] font-extrabold text-zinc-300 uppercase block tracking-wider">HYGIENIC</span>
              <span className="text-xs font-black text-white">&amp; SAFE</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PromoBanner;
