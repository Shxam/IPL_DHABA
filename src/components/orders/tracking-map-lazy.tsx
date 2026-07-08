'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export const TrackingMapLazy = dynamic(
  () => import('./tracking-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-lg bg-cream/50 flex items-center justify-center border border-border animate-pulse">
        <span className="text-muted text-sm font-semibold">Loading Live Map...</span>
      </div>
    )
  }
);
