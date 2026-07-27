'use client';

import React, { useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MenuItem } from '@/types';
import Navbar from '@/components/shared/navbar';
import BottomNav from '@/components/shared/bottom-nav';
import { useCartStore } from '@/store/use-cart-store';
import { ArrowLeft, Share2, Plus, Minus, ShoppingCart, Loader2, Check, Flame } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const getImageUrl = (url?: string) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanedPath = url.replace(/^\.?\/?/, '');
  return `/${cleanedPath}`;
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addedToast, setAddedToast] = useState(false);

  // Available Add-ons matching design spec
  const addons = [
    { id: 'extra-butter', name: 'Extra Butter', price: 30 },
    { id: 'spicy', name: 'Spicy 🌶️🌶️', price: 20 },
    { id: 'add-naan', name: 'Add Naan', price: 39 },
  ];

  // Fetch Menu Item details
  const { data: menuData, isLoading } = useQuery<{ items: MenuItem[] }>({
    queryKey: ['menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      return res.json();
    },
  });

  const item = menuData?.items.find((i) => i.id === id) || {
    id: id || '1',
    name: 'Butter Chicken',
    description: 'Rich, creamy tomato-based gravy with tender chicken pieces, finished with a dollop of butter. Perfect for match day!',
    price: 279,
    food_type: 'non_veg' as const,
    image_url: '/placeholder.jpg',
    category_id: 'cat-1',
    is_available: true,
    is_featured: true,
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((i) => i !== addonId) : [...prev, addonId]
    );
  };

  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const found = addons.find((a) => a.id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);

  const totalPrice = (item.price + addonsTotal) * quantity;

  const handleAddToCart = () => {
    addItem({
      menu_item_id: item.id,
      name: `${item.name}${selectedAddons.length > 0 ? ` (${selectedAddons.join(', ')})` : ''}`,
      price: item.price + addonsTotal,
      quantity: quantity,
      image_url: getImageUrl(item.image_url),
      food_type: item.food_type,
    });

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      router.push('/cart');
    }, 800);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `IPL Dhaba - ${item.name}`,
          text: `Check out ${item.name} on IPL Dhaba!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share error:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard! 🏏');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
        <span className="text-xs font-bold mt-2">Preparing dish details...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pb-28 relative">
      
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-saffron text-white font-extrabold px-6 py-3 rounded-full shadow-saffron flex items-center gap-2 text-xs animate-in slide-in-from-top">
          <Check size={16} strokeWidth={3} />
          <span>That&apos;s a SIX! Added to cart 🏏</span>
        </div>
      )}

      {/* Hero Image Header with Navigation Buttons */}
      <div className="relative w-full aspect-[4/3] max-h-[380px] bg-zinc-900 overflow-hidden">
        <Image
          src={getImageUrl(item.image_url)}
          alt={item.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/60" />

        {/* Top Floating Buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-700/80 text-white flex items-center justify-center shadow-lg hover:bg-zinc-800 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-700/80 text-saffron flex items-center justify-center shadow-lg hover:bg-zinc-800 transition-all"
            aria-label="Share dish"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Details */}
      <main className="max-w-2xl mx-auto w-full px-5 -mt-6 z-10 flex flex-col gap-6">
        
        {/* Title, Veg Badge, Price & Description */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-white tracking-wide leading-tight">
              {item.name}
            </h1>
            
            {/* Veg / Non-Veg Indicator */}
            <div className="flex flex-col items-center gap-0.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md flex-shrink-0">
              <span
                className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${
                  item.food_type === 'veg' ? 'border-emerald-500' : 'border-red-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.food_type === 'veg' ? 'bg-emerald-500' : 'bg-red-600'
                  }`}
                />
              </span>
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-tighter">
                {item.food_type === 'veg' ? 'VEG' : 'NON-VEG'}
              </span>
            </div>
          </div>

          <div className="text-2xl font-black text-saffron tracking-tight">
            {formatPrice(item.price)}
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed mt-1">
            {item.description || 'Rich, creamy tomato-based gravy with tender chicken pieces, finished with a dollop of butter.'}
          </p>
          <span className="text-xs font-bold text-amber-400 italic">
            Perfect for match day!
          </span>
        </div>

        {/* Quantity Stepper Selector */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400">QUANTITY</span>
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1.5">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <Minus size={16} strokeWidth={3} />
            </button>
            <span className="font-extrabold text-sm text-white min-w-[20px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="text-saffron hover:text-saffron-hover transition-colors"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Customise Section with Checkbox Addons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-saffron uppercase tracking-wider border-b border-zinc-800 pb-2">
            <span>CUSTOMISE</span>
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
              <Flame size={10} className="fill-amber-400" />
              POPULAR
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {addons.map((addon) => {
              const isChecked = selectedAddons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-saffron/10 border-saffron/80 text-white shadow-saffron/10'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-saffron border-saffron text-white' : 'border-zinc-700 bg-zinc-950'
                      }`}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className="text-xs font-extrabold">{addon.name}</span>
                  </div>
                  <span className="text-xs font-black text-saffron">+ {formatPrice(addon.price)}</span>
                </label>
              );
            })}
          </div>
        </div>

      </main>

      {/* Sticky Bottom Full-Width ADD TO CART CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur-lg p-4 flex justify-center">
        <button
          onClick={handleAddToCart}
          className="max-w-2xl w-full bg-saffron hover:bg-saffron-hover text-white font-black text-sm py-4 rounded-2xl shadow-saffron flex items-center justify-between px-6 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} />
            <span className="uppercase tracking-wider">ADD TO CART</span>
          </div>
          <span className="text-base font-black">{formatPrice(totalPrice)}</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
