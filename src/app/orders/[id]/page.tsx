'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Order } from '@/types';
import Navbar from '@/components/shared/navbar';
import StatusTimeline from '@/components/orders/status-timeline';
import { TrackingMapLazy } from '@/components/orders/tracking-map-lazy';
import { Loader2, CheckCircle2, ChevronLeft, XCircle, Star } from 'lucide-react';
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
  const [loadingReview, setLoadingReview] = useState<boolean>(false);
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

    console.log(`[Supabase Realtime] Subscribing to order:${orderId}`);
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
          console.log('[Supabase Realtime] Received order update:', payload.new);
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
          
          setRealtimeMsg(`Status updated to: ${payload.new.status.toUpperCase()}!`);
          setTimeout(() => setRealtimeMsg(null), 5000);
        }
      )
      .subscribe();

    return () => {
      console.log(`[Supabase Realtime] Unsubscribing from order:${orderId}`);
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
      console.error('Error submitting review:', err);
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleGoogleReviewClick = async () => {
    if (!existingReview) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ google_review_clicked: true })
        .eq('id', existingReview.id);
      
      if (error) throw error;
      
      setExistingReview((prev: any) => prev ? { ...prev, google_review_clicked: true } : null);
      
      const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://maps.google.com';
      window.open(googleReviewUrl, '_blank');
    } catch (err) {
      console.error('Error updating google review click tracking:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream/35 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
        <span className="text-sm font-semibold text-muted">Locating your order receipt...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-cream/35 flex flex-col items-center justify-center text-center p-4">
        <XCircle className="w-12 h-12 text-cancelled" />
        <h2 className="font-bold text-ink text-xl mt-3">Order tracking details missing</h2>
        <p className="text-sm text-muted mt-1 max-w-sm">
          Please verify the order link or contact restaurant support if you believe this is an error.
        </p>
        <Link href="/" className="mt-6 text-saffron font-bold text-sm hover:underline flex items-center gap-1">
          <ChevronLeft size={16} />
          Return to Dhaba Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-16">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 w-full mt-8 flex-1">
        
        {/* Back Link */}
        <Link href="/" className="text-muted hover:text-saffron text-xs font-bold flex items-center gap-1 mb-4 w-fit">
          <ChevronLeft size={14} />
          Back to Dishes
        </Link>

        {/* Real-time Toast notification */}
        {realtimeMsg && (
          <div className="bg-green text-white px-4 py-3 rounded-lg shadow-premium flex items-center gap-2 mb-6 animate-in slide-in-from-top duration-200">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold tracking-wide">{realtimeMsg}</span>
          </div>
        )}

        {/* Order success header */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm flex flex-col text-center items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-green/10 text-green flex items-center justify-center mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-ink">Order Tracked Successfully!</h2>
          <span className="text-xs font-semibold text-saffron mt-1 uppercase tracking-wider">
            Order ID: #{order.order_number || order.id.slice(0, 8)}
          </span>
          <p className="text-xs text-muted mt-2 max-w-md">
            Your fresh meal is registered. We will send status notifications as it is prepared and delivered.
          </p>
        </div>

        {/* Real-time tracking progress timeline */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm mb-6">
          <h3 className="font-bold text-sm text-ink border-b border-border pb-2 mb-6 uppercase tracking-wide">
            Delivery Progress
          </h3>
          <StatusTimeline status={order.status} />
        </div>

        {/* Live Delivery Agent Location Tracking Map */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm mb-6">
            <h3 className="font-bold text-sm text-ink border-b border-border pb-2 mb-4 uppercase tracking-wide">
              Live Map Tracking
            </h3>
            <TrackingMapLazy 
              restaurantCoords={[15.2531, 80.0271]} // Default Dhaba coordinates
              customerCoords={
                order.delivery_address?.latitude && order.delivery_address?.longitude
                  ? [order.delivery_address.latitude, order.delivery_address.longitude]
                  : null
              }
              agentCoords={driverLocation ? [driverLocation.lat, driverLocation.lng] : null}
            />
            <span className="text-[10px] text-muted block mt-2 text-center">
              Coordinates pinned for delivery accuracy. Realtime WebSocket updates active.
            </span>
          </div>
        )}

        {/* Rate Your Experience (Delivered Order Feedback) */}
        {order.status === 'delivered' && (
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm mb-6">
            <h3 className="font-bold text-sm text-ink border-b border-border pb-2 mb-4 uppercase tracking-wide">
              Rate Your Experience 🏏
            </h3>
            
            {loadingReview ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-saffron" />
              </div>
            ) : existingReview ? (
              <div className="flex flex-col items-center text-center py-4">
                <div className="flex gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={star <= existingReview.rating ? 'fill-saffron text-saffron' : 'text-border'}
                    />
                  ))}
                </div>
                {existingReview.comment && (
                  <p className="text-sm italic text-muted max-w-md bg-cream/20 border border-border/40 rounded-xl px-4 py-3 mb-4">
                    &quot;{existingReview.comment}&quot;
                  </p>
                )}
                
                {existingReview.rating >= 4 ? (
                  <div className="bg-saffron/5 border border-saffron/20 rounded-2xl p-5 max-w-md mt-2 flex flex-col items-center">
                    <span className="text-xs font-bold text-saffron uppercase tracking-wider mb-2">Google Review Funnel</span>
                    <p className="text-xs text-muted mb-4 font-semibold">
                      We&apos;re thrilled you enjoyed your food! Would you support our Dhaba by leaving a Google review?
                    </p>
                    {existingReview.google_review_clicked ? (
                      <span className="text-xs text-green font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Thank you! Google review link clicked.
                      </span>
                    ) : (
                      <button
                        onClick={handleGoogleReviewClick}
                        className="bg-saffron hover:bg-saffron-hover text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-saffron transition-all active:scale-[0.98]"
                      >
                        Write Google Review
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted font-bold mt-2">
                    Thank you for your feedback! We&apos;ll use this to improve our kitchen quality immediately.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-2 py-2">
                  <span className="text-xs font-semibold text-muted">Tap to rate:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform active:scale-90 hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={
                            star <= (hoverRating || rating)
                              ? 'fill-saffron text-saffron'
                              : 'text-border hover:text-saffron/55'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">Share your thoughts (Optional):</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about the taste, service, or packaging..."
                    rows={3}
                    className="w-full bg-cream/10 border border-border hover:border-border-hover focus:border-saffron focus:ring-1 focus:ring-saffron text-sm rounded-xl p-3 outline-none transition-all resize-none text-ink"
                  />
                </div>

                {reviewError && (
                  <span className="text-xs font-semibold text-cancelled">{reviewError}</span>
                )}

                <button
                  type="submit"
                  disabled={rating === 0 || submittingReview}
                  className="w-full bg-saffron hover:bg-saffron-hover text-white font-bold text-sm py-3 rounded-xl shadow-saffron disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {submittingReview ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting Review...</span>
                    </div>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Summary Details */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-sm text-ink border-b border-border pb-2 mb-4 uppercase tracking-wide">
            Receipt Summary
          </h3>
          <div className="flex flex-col gap-3">
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm text-ink">
                <span>{item.name} <span className="text-xs text-muted">x{item.quantity}</span></span>
                <span className="font-semibold">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            
            <div className="border-t border-dashed border-border pt-3 mt-1 flex flex-col gap-1.5 text-xs text-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-ink border-t border-border pt-1.5 mt-1">
                <span>Total Amount</span>
                <span className="text-saffron text-base">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
