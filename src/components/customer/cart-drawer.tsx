'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCartStore } from '@/store/use-cart-store';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2, MapPin, ShoppingCart, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { LocationPickerLazy } from './location-picker-lazy';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be a 10-digit number'),
  address_line: z.string().min(5, 'Delivery address must be at least 5 characters'),
  instructions: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { 
    items, 
    subtotal, 
    deliveryFee, 
    totalAmount, 
    minOrderWarning, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCartStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([15.2531, 80.0271]); // Default Singarayakonda

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
  });

  const handleLocationSelected = (lat: number, lng: number) => {
    setCoordinates([lat, lng]);
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (items.length === 0 || subtotal < 100) return;

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer_name: values.customer_name,
        phone: values.phone,
        delivery_address: {
          address_line: values.address_line,
          city: 'Singarayakonda',
          pincode: '523101',
          latitude: coordinates[0],
          longitude: coordinates[1],
        },
        delivery_instructions: values.instructions || '',
        items: items.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        })),
        payment_method: 'cod',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Success cleanup
      clearCart();
      onClose();
      router.push(`/orders/${data.order.id}?token=${encodeURIComponent(data.order.tracking_token)}`);
    } catch (error: any) {
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Your Cart">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingCart className="w-12 h-12 mb-3 text-muted/40" />
          <h3 className="font-bold text-ink text-base">Your Cart is Empty</h3>
          <p className="text-xs text-muted mt-1 max-w-[200px]">
            Add delicious dishes from the menu to satisfy your cravings.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Minimum Order Warning */}
          {minOrderWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded flex items-center justify-center gap-2 text-center">
              <AlertTriangle size={14} />
              <span>{minOrderWarning}</span>
            </div>
          )}

          {/* Items List */}
          <div className="flex flex-col gap-4 border-b border-border pb-4">
            {items.map((item) => (
              <div key={item.menu_item_id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-ink text-sm truncate">{item.name}</h4>
                  <span className="text-xs text-muted">{formatPrice(item.price)} each</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center bg-cream border border-border rounded">
                    <button 
                      onClick={() => updateQuantity(item.menu_item_id, -1)}
                      className="p-1 hover:text-saffron transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    <span className="min-w-[18px] text-center font-bold text-xs text-ink">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.menu_item_id, 1)}
                      className="p-1 hover:text-saffron transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>

                  <span className="font-bold text-ink text-sm min-w-[50px] text-right">
                    {formatPrice(item.price * item.quantity)}
                  </span>

                  <button 
                    onClick={() => removeItem(item.menu_item_id)}
                    className="text-muted hover:text-cancelled transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Section */}
          <div className="bg-cream/40 p-4 rounded-md flex flex-col gap-1.5 text-xs text-muted border border-border/60">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold text-ink">{formatPrice(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-ink border-t border-dashed border-border pt-1.5 mt-1">
              <span>Total Amount</span>
              <span className="text-saffron">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {/* Checkout Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <h3 className="font-bold text-sm text-ink border-b border-border pb-1">Delivery Details</h3>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Your Name *</label>
              <Input 
                placeholder="Enter full name" 
                error={errors.customer_name?.message}
                {...register('customer_name')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Phone Number *</label>
              <Input 
                type="tel"
                placeholder="10-digit mobile number" 
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Delivery Address *</label>
              <Input 
                placeholder="Enter complete address" 
                error={errors.address_line?.message}
                {...register('address_line')}
              />
            </div>

            {/* Optional Location Pinning */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1.5 text-xs font-semibold text-saffron hover:underline w-fit"
              >
                <MapPin size={14} />
                <span>{showMap ? 'Hide Map Pin' : 'Pin Accurate Delivery Location (Map)'}</span>
              </button>

              {showMap && (
                <div className="mt-1">
                  <LocationPickerLazy 
                    initialCoords={coordinates}
                    onLocationSelect={handleLocationSelected}
                  />
                  <span className="text-[10px] text-muted block mt-1">
                    Click/Drag the pin to point your doorstep on the map.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Instructions (Optional)</label>
              <Input 
                placeholder="e.g. Keep at gate, ring the bell" 
                error={errors.instructions?.message}
                {...register('instructions')}
              />
            </div>

            {/* Place Order CTA */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={subtotal < 100}
              className="w-full py-3.5 mt-2"
            >
              Place Order - Cash on Delivery
            </Button>
          </form>

        </div>
      )}
    </Sheet>
  );
};
export default CartDrawer;
