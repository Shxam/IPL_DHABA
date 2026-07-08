'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export const LocationPickerLazy = dynamic(
  () => import('./location-picker'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-64 rounded-md bg-cream/50 flex items-center justify-center border border-border animate-pulse">
        <span className="text-muted text-sm font-semibold">Loading Map Picker...</span>
      </div>
    )
  }
);
