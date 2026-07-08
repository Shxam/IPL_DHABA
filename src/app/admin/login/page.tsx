'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/use-user-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogIn, ChevronLeft, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setSessionToken } = useUserStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      if (!data.user || !data.session) throw new Error('Failed to retrieve user session');

      // 2. Fetch user profile role from public profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Access denied. Profile not found.');
      }

      const role = profile.role || 'customer';
      if (role === 'customer') {
        throw new Error('Unauthorized access. Staff credentials required.');
      }

      // 3. Set Zustand session state
      setUser(profile);
      setSessionToken(data.session.access_token);

      // 4. Redirect based on role
      if (role === 'delivery') {
        router.push('/admin/delivery');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('[Admin Login] Authentication error:', err.message);
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
      {/* Return to menu link */}
      <Link href="/" className="text-muted hover:text-saffron text-xs font-bold flex items-center gap-1 mb-6">
        <ChevronLeft size={14} />
        Back to Dhaba Menu
      </Link>

      <Card className="w-full max-w-md shadow-premium border-border bg-surface">
        <CardHeader className="text-center pb-4 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="IPL Dhaba Logo"
            width={70}
            height={70}
            className="rounded-full shadow-sm object-cover mb-2"
          />
          <CardTitle className="text-xl font-bold font-display text-saffron">Staff Portal</CardTitle>
          <CardDescription className="text-xs text-muted mt-1">
            Enter credentials to manage order queues and categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          {/* Error Message Toast */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2 text-cancelled text-xs font-semibold mb-4">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="e.g. manager@ipldhaba.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full py-3 mt-2 flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
