'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { MenuItem, Category, FoodType } from '@/types';
import Navbar from '@/components/shared/navbar';
import BottomNav from '@/components/shared/bottom-nav';
import LiveScoreboard from '@/components/customer/live-scoreboard';
import PromoBanner from '@/components/customer/promo-banner';
import CategoryChips from '@/components/customer/category-chips';
import MenuCard from '@/components/customer/menu-card';
import ItemModal from '@/components/customer/item-modal';
import CartDrawer from '@/components/customer/cart-drawer';
import { Search, Filter, HelpCircle, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';

interface MenuDataResponse {
  categories: Category[];
  items: MenuItem[];
}

export default function HomePage() {
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodType, setSelectedFoodType] = useState<FoodType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch Menu data (categories + items) using React Query
  const { data, isLoading, error } = useQuery<MenuDataResponse>({
    queryKey: ['menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Network error loading menu');
      return res.json();
    },
  });

  const categories = data?.categories || [];
  const items = data?.items || [];

  // Filter menu items based on state filters
  const filteredItems = items.filter((item) => {
    // Category filter
    const matchesCategory = activeCategoryId === 'all' || item.category_id === activeCategoryId;
    
    // Food type filter (Veg/Non-Veg/Egg)
    const matchesFoodType = selectedFoodType === 'all' || item.food_type === selectedFoodType;
    
    // Search query filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesFoodType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-28">
      {/* Top Navbar */}
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      {/* Hero Banner Section */}
      <section className="relative w-full h-[36vh] min-h-[260px] bg-zinc-950 flex flex-col justify-end p-6 md:p-12 overflow-hidden">
        <Image
          src="/IPL DHABA ITEMS/star chicken starter.jpeg"
          alt="IPL Dhaba Feast Hero"
          fill
          sizes="100vw"
          className="object-cover opacity-50 z-0"
          priority
        />
        {/* Dark Vignette Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40 z-[1]" />

        <div className="max-w-7xl mx-auto w-full z-10 relative flex flex-col gap-1">
          <div className="flex justify-between items-center w-full">
            <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 px-3 py-1 rounded-full text-xs font-black shadow-md animate-pulse">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              OPEN NOW
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black text-saffron tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] uppercase mt-2">
            IPL DHABA — <span className="text-white">INDIAN PRIME LINE</span>
          </h1>
          <p className="text-xs sm:text-base font-bold text-zinc-200 tracking-wide drop-shadow-md">
            Where Flavours Hit Like a Six!
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 flex flex-col gap-6">
        
        {/* LIVE CRICKET SCOREBOARD WIDGET */}
        <LiveScoreboard />

        {/* PROMO BANNER: CRICKET. FOOD. EMOTIONS. */}
        <PromoBanner />

        {/* Floating Search Bar */}
        <div id="search" className="w-full">
          <div className="flex items-center gap-2 bg-surface border border-border shadow-premium rounded-full px-4 py-3 focus-within:ring-2 focus-within:ring-saffron/20 focus-within:border-saffron transition-all">
            <Search className="text-muted w-5 h-5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search dishes by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm outline-none bg-transparent placeholder:text-muted/65 text-ink"
            />
          </div>
        </div>

        {/* Category selection bar */}
        <CategoryChips
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />

        {/* Filter controls (Veg / Non-veg chips) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted flex items-center gap-1">
            <Filter size={12} />
            Diet Filter:
          </span>
          {(['all', 'veg', 'non_veg', 'egg'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFoodType(type)}
              className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full border transition-all ${
                selectedFoodType === type
                  ? 'bg-saffron border-saffron text-white shadow-saffron'
                  : 'bg-surface border-border text-muted hover:border-saffron hover:text-saffron'
              }`}
            >
              {type === 'all' ? 'Show All' : type.replace('_', '-').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-saffron" />
            <span className="text-sm font-bold">Loading sixer menu items...</span>
          </div>
        )}

        {/* Fetch Error handling */}
        {error && (
          <div className="text-center py-16">
            <AlertTriangle className="mx-auto w-12 h-12 text-saffron" />
            <h3 className="font-bold text-ink text-lg mt-3">Failed to load the menu</h3>
            <p className="text-sm text-muted mt-1">Please refresh the page or check back shortly.</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* POPULAR PICKS SECTION */}
            <section className="mt-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-ink uppercase tracking-wider flex items-center gap-2">
                  Popular Picks 🏏
                </h2>
                <button
                  onClick={() => setActiveCategoryId('all')}
                  className="text-xs font-bold text-saffron hover:underline flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-border shadow-sm">
                  <HelpCircle className="mx-auto w-12 h-12 text-muted/40" />
                  <h3 className="font-bold text-ink text-base mt-3">No matching dishes found</h3>
                  <p className="text-xs text-muted mt-1">Try resetting your filters or search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredItems.map((item) => (
                    <MenuCard key={item.id} item={item} onImageClick={setSelectedItem} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Details modal popup */}
      <ItemModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Checkout cart sidebar drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Fixed Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
