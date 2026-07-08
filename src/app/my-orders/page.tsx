'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useOtpStore } from '@/store/use-otp-store';
import Navbar from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ClipboardList, Loader2, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface OrderSummary {
  id: string;
  order_number: number;
  sequential_id?: number;
  created_at: string;
  total_amount: number;
  status: string;
}

export default function MyOrdersPage() {
  const {
    otpToken,
    otpVerified,
    phone: verifiedPhone,
    setOtpToken,
    setOtpVerified,
    setPhone,
    resetOtp,
  } = useOtpStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpBoxValues, setOtpBoxValues] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersFetched, setOrdersFetched] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetchMyOrders = useCallback(async (phone: string, token: string = otpToken || '') => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/mine?phone=${encodeURIComponent(phone)}`, {
        headers: {
          'x-otp-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');
      setOrders(data.orders || []);
      setOrdersFetched(true);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, [otpToken]);

  // Keep phone input sync'd with store if already verified
  useEffect(() => {
    if (otpVerified && verifiedPhone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMyOrders(verifiedPhone);
    }
  }, [otpVerified, verifiedPhone, fetchMyOrders]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phoneNumber)) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }

    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setOtpSent(true);
      setCountdown(60);
    } catch (e: any) {
      setOtpError(e.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      setOtpToken(data.token);
      setOtpVerified(true);
      setPhone(normalizedPhone);
      
      await fetchMyOrders(normalizedPhone, data.token);
    } catch (e: any) {
      setOtpError(e.message);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleOtpBoxChange = (val: string, index: number) => {
    const cleanVal = val.replace(/\D/g, '');
    const newValues = [...otpBoxValues];
    newValues[index] = cleanVal.slice(-1);
    setOtpBoxValues(newValues);

    if (cleanVal && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const code = newValues.join('');
    if (code.length === 6) {
      handleVerifyOtp(code);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpBoxValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResetSearch = () => {
    resetOtp();
    setOtpSent(false);
    setPhoneNumber('');
    setOtpBoxValues(Array(6).fill(''));
    setOrders([]);
    setOrdersFetched(false);
    setOtpError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
      case 'preparing':
        return 'bg-amber-100 text-amber-800';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-16">
      <Navbar />

      <main className="max-w-md mx-auto px-4 w-full mt-10 flex-1 flex flex-col">
        <h2 className="text-xl font-extrabold text-ink flex items-center gap-2 mb-6">
          <ClipboardList className="text-saffron" />
          My IPL Dhaba Orders
        </h2>

        {!otpVerified ? (
          <div className="bg-surface border border-border p-6 rounded-lg shadow-sm flex flex-col gap-4">
            <p className="text-xs text-muted leading-relaxed">
              Verify your phone number with an OTP to check your previous orders and retrieve their tracking links.
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSent}
                  className="flex-1"
                />
                {!otpSent && (
                  <Button
                    onClick={handleSendOtp}
                    isLoading={otpSending}
                    disabled={phoneNumber.length !== 10}
                    className="bg-charcoal text-white font-bold h-10 px-4 text-xs"
                  >
                    Send OTP
                  </Button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">Enter 6-Digit OTP</label>
                <div className="flex justify-between gap-1.5">
                  {Array(6).fill(0).map((_, i) => (
                    <input
                      key={i}
                      id={`otp-history-${i}`}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      maxLength={1}
                      value={otpBoxValues[i]}
                      onChange={(e) => handleOtpBoxChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="w-10 h-11 border border-border bg-white rounded text-center text-sm font-bold text-ink focus:outline-none focus:ring-1 focus:ring-saffron"
                    />
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  {countdown > 0 ? (
                    <span className="text-[10px] text-muted">Resend code in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] text-saffron font-bold hover:underline"
                    >
                      Resend OTP code?
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtpBoxValues(Array(6).fill(''));
                      setOtpError(null);
                    }}
                    className="text-[10px] text-muted hover:text-ink font-bold"
                  >
                    Edit Phone Number
                  </button>
                </div>
              </div>
            )}

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded">
                ⚠️ {otpError}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1">
            {/* Header info */}
            <div className="bg-surface border border-border p-4 rounded-lg flex justify-between items-center shadow-sm">
              <div>
                <span className="text-[10px] text-muted block uppercase font-bold tracking-wide">Verified Number</span>
                <span className="text-sm font-extrabold text-ink">{verifiedPhone}</span>
              </div>
              <button
                onClick={handleResetSearch}
                className="text-xs text-saffron hover:underline font-bold"
              >
                Change Number
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="animate-spin text-saffron w-6 h-6" />
                <span className="text-xs text-muted font-semibold">Retrieving your orders...</span>
              </div>
            ) : ordersFetched && orders.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl mb-2">🏏</span>
                <h3 className="font-bold text-ink text-sm">No Orders Found</h3>
                <p className="text-xs text-muted mt-1 max-w-[200px] leading-relaxed">
                  We couldn&apos;t find any orders placed under this mobile number.
                </p>
                <Link href="/" className="mt-4 text-xs font-bold text-saffron hover:underline flex items-center gap-1">
                  Go to Dhaba Menu <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((o) => {
                  const sId = o.sequential_id || o.order_number;
                  const displayId = sId ? `DHB-${String(sId).padStart(4, '0')}` : `#${o.id.slice(0, 8)}`;
                  const dateStr = new Date(o.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={o.id}
                      className="bg-surface border border-border rounded-lg p-4 shadow-sm hover:border-saffron/40 transition-colors flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-ink text-sm">{displayId}</span>
                          <span className="text-[10px] text-muted block mt-0.5">{dateStr}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getStatusColor(o.status)}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border/60">
                        <div>
                          <span className="text-[10px] text-muted block uppercase tracking-wide">Total Paid</span>
                          <span className="font-bold text-saffron text-sm">{formatPrice(o.total_amount)}</span>
                        </div>
                        <Link
                          href={`/orders/${o.id}`}
                          className="bg-charcoal text-white hover:bg-charcoal/90 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                        >
                          Track Order
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
