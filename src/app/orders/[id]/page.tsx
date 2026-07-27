'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Order } from '@/types';
import Navbar from '@/components/shared/navbar';
import BottomNav from '@/components/shared/bottom-nav';
import { TrackingMapLazy } from '@/components/orders/tracking-map-lazy';
import { 
  Loader2, CheckCircle2, ChevronLeft, XCircle, Star, 
  Phone, MessageSquare, ShieldCheck, MapPin, Bike, Zap 
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useDeliveryLocation } from '@/hooks/useDeliveryLocation';

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const searchParams = useSearchParams();
  const trackingToken = searchParams.get('token');
  const queryClient = useQueryClient();
  const [realtimeMsg, setRealtimeMsg] = useState<string | null>(null);
  const driverLocation = useDeliveryLocation(orderId);

  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // 1. Fetch order details using React Query
  const { data: orderResponse, isLoading, error } = useQuery<{ order: Order }>({
    queryKey: ['order', orderId, trackingToken],
    queryFn: async () => {
      const query = trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : '';
      const res = await fetch(`/api/orders/${orderId}${query}`);
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const order = orderResponse?.order;

  // 2. Set up real-time subscription for changes to this specific order
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          queryClient.setQueryData(['order', orderId, trackingToken], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              order: {
                ...oldData.order,
                ...payload.new,
              },
            };
          });
          
          setRealtimeMsg(`Status updated: ${payload.new.status.toUpperCase()}! 🏏`);
          setTimeout(() => setRealtimeMsg(null), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient, trackingToken]);

  // 3. Fetch existing review if order is delivered
  useEffect(() => {
    if (!orderId || order?.status !== 'delivered') return;

    let isMounted = true;
    Promise.resolve().then(async () => {
      try {
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();
        if (isMounted) {
          if (data) setExistingReview(data);
          setLoadingReview(false);
        }
      } catch (err) {
        console.error('Error fetching review:', err);
        if (isMounted) setLoadingReview(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [orderId, order?.status]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !order) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          customer_id: order.customer_id || null,
          rating,
          comment: comment.trim() || null
        })
        .select()
        .single();

      if (error) throw error;
      setExistingReview(data);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleGoogleReviewClick = async () => {
    if (!existingReview) return;
    try {
      await supabase
        .from('reviews')
        .update({ google_review_clicked: true })
        .eq('id', existingReview.id);
      
      setExistingReview((prev: any) => prev ? { ...prev, google_review_clicked: true } : null);
      const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://maps.google.com';
      window.open(googleReviewUrl, '_blank');
    } catch (err) {
      console.error('Google review click error:', err);
    }
  };

  // Stepper timeline helper
  const getStepStatus = (stepIndex: number, currentStatus?: string) => {
    const statusMap: Record<string, number> = {
      placed: 1,
      confirmed: 1,
      preparing: 2,
      out_for_delivery: 3,
      delivered: 4,
      cancelled: 0,
    };
    const activeLevel = statusMap[currentStatus || 'placed'] || 1;
    if (stepIndex < activeLevel) return 'completed';
    if (stepIndex === activeLevel) return 'live';
    return 'pending';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
        <span className="text-xs font-bold text-zinc-400">Locating your live match order receipt...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 text-white">
        <XCircle className="w-14 h-14 text-red-500" />
        <h2 className="font-extrabold text-white text-xl mt-3 uppercase">Order tracking details missing</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Please verify your tracking receipt link or contact IPL Dhaba support.
        </p>
        <Link href="/" className="mt-6 bg-saffron text-white font-extrabold text-xs px-6 py-3 rounded-full shadow-saffron">
          Return to Dhaba Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pb-28">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 w-full mt-6 flex-1 flex flex-col gap-5">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <Link href="/" className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
            <ChevronLeft size={18} />
          </Link>

          <div className="text-center">
            <h1 className="font-display text-lg sm:text-xl font-black uppercase text-white tracking-wide">
              TRACKING ORDER <span className="text-saffron">#IPL{order.order_number || order.id.slice(0, 4)}</span>
            </h1>
            <p className="text-[11px] font-semibold text-zinc-400">
              Sit Tight! Great Food &amp; Thrills on the Way!
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-saffron/10 border border-saffron/40 flex items-center justify-center text-saffron font-bold text-xs">
            🏏
          </div>
        </div>

        {/* Compact Live Score Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-lg text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[10px]">RCB</div>
            <span className="font-black text-saffron">162/4</span>
            <span className="text-[10px] text-zinc-500">18.2 OV</span>
          </div>

          <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">VS</span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">20.0 OV</span>
            <span className="font-black text-emerald-400">158/6</span>
            <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 font-black flex items-center justify-center text-[10px]">KKR</div>
          </div>
        </div>

        {/* Real-time Toast notification */}
        {realtimeMsg && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top">
            <Zap size={16} />
            <span>{realtimeMsg}</span>
          </div>
        )}

        {/* 4-STEP CRICKET TIMELINE */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col gap-6">
          
          {/* Timeline Item 1 */}
          <div className="flex items-start gap-4 relative">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-xl flex-shrink-0 shadow-lg z-10">
              🪵
            </div>
            <div className="flex-1 border-b border-zinc-800/80 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-saffron uppercase tracking-wider block">STEP 1</span>
                  <h4 className="font-extrabold text-sm text-white">Toss Won – Order Confirmed</h4>
                  <p className="text-xs text-zinc-400">Your order is in our court!</p>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                  COMPLETED
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Item 2 */}
          <div className="flex items-start gap-4 relative">
            <div className="w-12 h-12 rounded-full bg-saffron/20 border-2 border-saffron text-saffron flex items-center justify-center text-xl flex-shrink-0 shadow-saffron z-10 animate-pulse">
              👨‍🍳
            </div>
            <div className="flex-1 border-b border-zinc-800/80 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-saffron uppercase tracking-wider block">STEP 2</span>
                  <h4 className="font-extrabold text-sm text-white">On the Pitch – Chef is preparing your meal</h4>
                  <p className="text-xs text-zinc-400">Deliciousness is cooking!</p>
                </div>
                <span className="text-[10px] font-extrabold text-white bg-saffron border border-saffron px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Item 3 */}
          <div className="flex items-start gap-4 relative opacity-60">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-zinc-800 text-zinc-500 flex items-center justify-center text-xl flex-shrink-0 z-10">
              🏏
            </div>
            <div className="flex-1 border-b border-zinc-800/80 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">STEP 3</span>
                  <h4 className="font-extrabold text-sm text-zinc-300">Out for Delivery – Boundary Hit!</h4>
                  <p className="text-xs text-zinc-500">Your order is on the way!</p>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-full">
                  PENDING
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Item 4 */}
          <div className="flex items-start gap-4 relative opacity-60">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border-2 border-zinc-800 text-zinc-500 flex items-center justify-center text-xl flex-shrink-0 z-10">
              🔥
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">STEP 4</span>
                  <h4 className="font-extrabold text-sm text-zinc-300">Delivered – Clean Bowled!</h4>
                  <p className="text-xs text-zinc-500">Enjoy your match &amp; meal!</p>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-full">
                  PENDING
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Live Map Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wide">Live Map Tracking</h3>
            <span className="text-[10px] font-extrabold text-saffron bg-saffron/10 border border-saffron/30 px-2.5 py-0.5 rounded-full">
              ETA: 12 MIN
            </span>
          </div>

          <div className="h-48 w-full rounded-xl overflow-hidden relative border border-zinc-800">
            <TrackingMapLazy 
              restaurantCoords={[15.2531, 80.0271]}
              customerCoords={
                order.delivery_address?.latitude && order.delivery_address?.longitude
                  ? [order.delivery_address.latitude, order.delivery_address.longitude]
                  : null
              }
              agentCoords={driverLocation ? [driverLocation.lat, driverLocation.lng] : null}
            />
          </div>
        </div>

        {/* Delivery Partner Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Helmet Avatar */}
            <div className="w-14 h-14 rounded-full bg-saffron/20 border-2 border-saffron flex items-center justify-center font-extrabold text-2xl text-saffron shadow-md">
              🪖
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-saffron uppercase tracking-wider block">
                ★ YOUR DELIVERY PARTNER ★
              </span>
              <h4 className="font-black text-base text-white">Virat Singh</h4>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-semibold">
                <span className="text-amber-400 flex items-center gap-0.5">
                  <Star size={12} className="fill-amber-400" /> 4.8
                </span>
                <span>• 350+ Deliveries</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="tel:+919876543210"
              className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 text-saffron flex items-center justify-center hover:bg-saffron hover:text-white transition-all shadow-md"
              title="Call Rider"
            >
              <Phone size={16} />
            </a>
            <a
              href="sms:+919876543210"
              className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 text-saffron flex items-center justify-center hover:bg-saffron hover:text-white transition-all shadow-md"
              title="Message Rider"
            >
              <MessageSquare size={16} />
            </a>
          </div>
        </div>

        {/* Footer Slogan */}
        <div className="text-center py-4 text-xs font-black italic tracking-wider text-saffron uppercase">
          GOOD FOOD. GREAT MATCHES. THAT&apos;S THE IPL DHABA PROMISE!
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
