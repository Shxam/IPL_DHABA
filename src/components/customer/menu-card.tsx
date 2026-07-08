'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { useCartStore } from '@/store/use-cart-store';
import { Plus, Minus, Flame } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface MenuCardProps {
  item: MenuItem;
  onImageClick?: (item: MenuItem) => void;
}

const getImageUrl = (url?: string) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanedPath = url.replace(/^\.?\/?/, '');
  return `/${cleanedPath}`;
};

export const MenuCard: React.FC<MenuCardProps> = ({ item, onImageClick }) => {
  const { items: cartItems, addItem, updateQuantity } = useCartStore();

  const cartItem = cartItems.find((ci) => ci.menu_item_id === item.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: getImageUrl(item.image_url),
      food_type: item.food_type,
    });
  };

  const handleIncrement = () => {
    updateQuantity(item.id, 1);
  };

  const handleDecrement = () => {
    updateQuantity(item.id, -1);
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-premium">
      
      {/* Food Type Indicator (Veg/Non-veg/Egg) */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm p-1 rounded border border-border shadow-sm">
        <span 
          className={`block w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${
            item.food_type === 'veg' 
              ? 'border-green-600' 
              : item.food_type === 'egg' 
                ? 'border-yellow-500' 
                : 'border-red-700'
          }`}
        >
          <span 
            className={`block w-1.5 h-1.5 rounded-full ${
              item.food_type === 'veg' 
                ? 'bg-green-600' 
                : item.food_type === 'egg' 
                  ? 'bg-yellow-500' 
                  : 'bg-red-700'
            }`}
          />
        </span>
      </div>

      {/* Featured Ribbon */}
      {item.is_featured && (
        <div className="absolute top-3 right-3 z-10 bg-saffron text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Flame size={10} className="fill-white" />
          <span>Special</span>
        </div>
      )}

      {/* Image container */}
      <div 
        onClick={() => onImageClick?.(item)}
        className="w-full aspect-[4/3] relative bg-cream/50 cursor-pointer overflow-hidden group"
      >
        <Image
          src={getImageUrl(item.image_url)}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Info Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 
          onClick={() => onImageClick?.(item)}
          className="font-bold text-ink hover:text-saffron transition-colors cursor-pointer text-base line-clamp-1"
        >
          {item.name}
        </h3>
        
        <p className="text-xs text-muted mt-1 mb-4 line-clamp-2 h-8 leading-snug">
          {item.description || 'Tasty and authentic Indian dish made with premium quality ingredients.'}
        </p>

        {/* Card Footer: Price & Cart Control */}
        <div className="flex justify-between items-center mt-auto">
          <span className="font-bold text-ink text-base">
            {formatPrice(item.price)}
          </span>

          {quantity > 0 ? (
            <div className="flex items-center bg-saffron text-white rounded-md overflow-hidden">
              <button 
                onClick={handleDecrement}
                className="px-2.5 py-1.5 hover:bg-black/10 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="min-w-[20px] text-center font-bold text-sm">
                {quantity}
              </span>
              <button 
                onClick={handleIncrement}
                className="px-2.5 py-1.5 hover:bg-black/10 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="bg-saffron hover:bg-saffron-hover text-white text-xs font-bold px-4 py-2 rounded-md shadow-saffron transition-all active:scale-[0.98]"
            >
              ADD
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
export default MenuCard;
