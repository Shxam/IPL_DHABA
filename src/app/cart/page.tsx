'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/use-cart-store';
import Navbar from '@/components/shared/navbar';
import BottomNav from '@/components/shared/bottom-nav';
import { 
  ArrowLeft, Trash2, Plus, Minus, Tag, 
  ShieldCheck, ArrowRight, ShoppingBag, Loader2, Sparkles 
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = subtotal > 0 ? 40 : 0;
  const taxes = Math.round(subtotal * 0.05); // 5% GST
  const totalPayable = Math.max(0, subtotal + deliveryFee + taxes - discount);
  const pointsEarned = Math.floor(totalPayable * 0.1); // 10% IPL Fan Points

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'IPLSIX' || couponCode.toUpperCase() === 'SIXER') {
      setDiscount(50);
      setAppliedCoupon(couponCode.toUpperCase());
      alert('Coupon Applied! You saved ₹50 🎉');
    } else {
      alert('Invalid Coupon Code. Try "IPLSIX"!');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      // Mock place order or API call
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
          delivery_address: {
            address_line: 'Doorstep Delivery, Singarayakonda, AP',
            latitude: 15.2531,
            longitude: 80.0271,
          },
          delivery_instructions: 'Match Day Order - Handle with care!',
          customer_name: 'Rahul Sharma',
          phone: '+919876543210',
          payment_method: 'cod',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      clearCart();
      const tokenQuery = data.tracking_token ? `?token=${data.tracking_token}` : '';
      router.push(`/orders/${data.orderId}${tokenQuery}`);
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pb-32">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 w-full mt-6 flex-1 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-saffron transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <h1 className="font-display text-xl font-black text-white uppercase tracking-wide">
            My Cart <span className="text-saffron">({items.reduce((s, i) => s + i.quantity, 0)} Items)</span>
          </h1>
          <div className="w-10" />
        </div>

        {/* Promo Header Banner */}
        <div className="relative w-full bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-full bg-saffron/20 border border-saffron/40 flex items-center justify-center font-extrabold text-saffron text-lg">
              🏏
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">GREAT FOOD. GREAT MATCHES.</span>
              <h3 className="font-display text-sm sm:text-base font-black text-saffron uppercase">UNBEATABLE COMBOS.</h3>
            </div>
          </div>
        </div>

        {/* Empty Cart View */}
        {items.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/60 rounded-2xl border border-zinc-800 p-8 shadow-inner flex flex-col items-center gap-3">
            <ShoppingBag className="w-12 h-12 text-zinc-600" />
            <h3 className="font-extrabold text-white text-base">Your Cart is Currently Clear</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Explore our tasty starters, curries, and biryani to fuel your match day experience!
            </p>
            <Link
              href="/"
              className="mt-4 bg-saffron hover:bg-saffron-hover text-white text-xs font-black px-6 py-3 rounded-full shadow-saffron transition-all"
            >
              BROWSE MENU
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Line Items List */}
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center shadow-lg relative"
                >
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-xl bg-zinc-800 relative overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image_url || '/placeholder.jpg'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between h-20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 border rounded-sm flex items-center justify-center ${
                            item.food_type === 'veg' ? 'border-emerald-500' : 'border-red-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.food_type === 'veg' ? 'bg-emerald-500' : 'bg-red-600'
                            }`}
                          />
                        </span>
                        <h4 className="font-extrabold text-sm text-white line-clamp-1">{item.name}</h4>
                      </div>

                      <button
                        onClick={() => removeItem(item.menu_item_id)}
                        className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-black text-saffron text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1">
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, -1)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="font-extrabold text-xs text-white min-w-[16px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, 1)}
                          className="text-saffron hover:text-saffron-hover"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashed Border Coupon Row */}
            <form
              onSubmit={handleApplyCoupon}
              className="border border-dashed border-saffron/60 bg-saffron/5 rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-saffron/20 text-saffron flex items-center justify-center">
                  🔥
                </div>
                <div>
                  <span className="text-xs font-black text-saffron uppercase tracking-wider block">
                    {appliedCoupon ? `COUPON '${appliedCoupon}' APPLIED` : 'APPLY COUPON'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block font-medium">
                    {appliedCoupon ? '₹50 Discount Applied!' : 'Unlock exciting offers! Use "IPLSIX"'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg uppercase w-20 text-white outline-none focus:border-saffron"
                />
                <button
                  type="submit"
                  className="text-xs font-black text-saffron hover:underline px-2"
                >
                  APPLY
                </button>
              </div>
            </form>

            {/* Bill Summary Card */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
              <h3 className="font-extrabold text-sm text-white border-b border-zinc-800 pb-2 uppercase tracking-wide">
                Bill Summary
              </h3>

              <div className="flex justify-between items-center text-xs text-zinc-300">
                <span>Item Total</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-zinc-300">
                <span>Delivery Fee</span>
                <span className="font-bold">{formatPrice(deliveryFee)}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-zinc-300">
                <span>Taxes (5% GST)</span>
                <span className="font-bold">{formatPrice(taxes)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>- {formatPrice(discount)}</span>
                </div>
              )}

              <div className="border-t border-zinc-800 pt-3 mt-1 flex justify-between items-center">
                <span className="font-extrabold text-sm text-white uppercase tracking-wider">Total Payable</span>
                <span className="text-2xl font-black text-saffron tracking-tight">{formatPrice(totalPayable)}</span>
              </div>

              {/* Trust & Loyalty Preview */}
              <div className="border-t border-zinc-800/80 pt-3 mt-2 flex justify-between items-center text-[11px] font-semibold text-zinc-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-saffron" />
                  Hygienic • Safe • On Time
                </span>
                <span className="text-amber-400 font-extrabold flex items-center gap-1">
                  <Sparkles size={12} />
                  You&apos;ll earn <span className="text-saffron">{pointsEarned}</span> IPL Points
                </span>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Sticky Bottom PROCEED TO PAY CTA */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur-lg p-4 flex justify-center">
          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="max-w-2xl w-full bg-saffron hover:bg-saffron-hover text-white font-black text-sm py-4 rounded-2xl shadow-saffron flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-wider"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Order...</span>
              </div>
            ) : (
              <>
                <span>🏏 PROCEED TO PAY</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
