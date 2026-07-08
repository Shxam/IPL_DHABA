'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { useCartStore } from '@/store/use-cart-store';
import { Dialog } from '@/components/ui/dialog';
import { Plus, Minus, Flame } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface ItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const getImageUrl = (url?: string) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanedPath = url.replace(/^\.?\/?/, '');
  return `/${cleanedPath}`;
};

export const ItemModal: React.FC<ItemModalProps> = ({ item, isOpen, onClose }) => {
  const { items: cartItems, addItem, updateQuantity } = useCartStore();

  if (!item) return null;

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
    <Dialog isOpen={isOpen} onClose={onClose} title={item.name}>
      <div className="flex flex-col gap-4">
        
        {/* Large Image */}
        <div className="w-full aspect-video relative rounded-md overflow-hidden bg-cream border border-border">
          <Image
            src={getImageUrl(item.image_url)}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-1">
          {/* Food Type */}
          <span 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold uppercase border ${
              item.food_type === 'veg' 
                ? 'bg-green/10 text-green border-green/20' 
                : item.food_type === 'egg'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                  : 'bg-red-50 text-red-700 border-red-100'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.food_type === 'veg' ? 'bg-green' : item.food_type === 'egg' ? 'bg-yellow-500' : 'bg-red-600'}`} />
            {item.food_type.replace('_', ' ')}
          </span>

          {item.is_featured && (
            <span className="inline-flex items-center gap-1 bg-saffron/10 text-saffron border border-saffron/20 text-xs font-semibold px-2.5 py-1 rounded uppercase">
              <Flame size={12} className="fill-saffron" />
              Dhaba Special
            </span>
          )}
        </div>

        {/* Description */}
        <div className="text-sm text-muted leading-relaxed mt-2 bg-cream/30 p-3 rounded-md border border-border/50">
          {item.description || 'No description available for this delicious dish.'}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted font-medium">Price</span>
            <span className="text-xl font-extrabold text-ink">{formatPrice(item.price)}</span>
          </div>

          {quantity > 0 ? (
            <div className="flex items-center bg-saffron text-white rounded-md overflow-hidden">
              <button 
                onClick={handleDecrement}
                className="px-4 py-2 hover:bg-black/10 transition-colors text-base"
                aria-label="Decrease quantity"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="min-w-[28px] text-center font-bold text-base">
                {quantity}
              </span>
              <button 
                onClick={handleIncrement}
                className="px-4 py-2 hover:bg-black/10 transition-colors text-base"
                aria-label="Increase quantity"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="bg-saffron hover:bg-saffron-hover text-white text-sm font-bold px-6 py-2.5 rounded-md shadow-saffron transition-all active:scale-[0.98]"
            >
              Add to Basket
            </button>
          )}
        </div>

      </div>
    </Dialog>
  );
};
export default ItemModal;
