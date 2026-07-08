'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/navbar';
import { Phone, Mail, ChevronLeft, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+91 99999 99999';
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@ipldhaba.com';

  return (
    <div className="min-h-screen bg-cream/35 flex flex-col pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 w-full mt-12 flex-1 flex flex-col justify-center items-center">
        
        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="text-muted hover:text-saffron text-xs font-bold flex items-center gap-1 mb-8 self-start transition-colors"
        >
          <ChevronLeft size={14} />
          Back to Dhaba Menu
        </Link>

        {/* Header Section */}
        <div className="text-center max-w-2xl mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-saffron to-amber-600 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-sm sm:text-base text-muted mt-3 font-medium">
            Have questions about your order, special catering requests, or just want to tell us how much you loved the food? Contact the IPL Dhaba team!
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          
          {/* Phone Card */}
          <a 
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="group block bg-surface border border-border hover:border-saffron/40 rounded-2xl p-8 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-saffron/5 group-hover:bg-saffron/10 transition-colors duration-300 blur-xl" />
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-saffron/10 text-saffron flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-ink uppercase tracking-wide">Call Support</h3>
              <p className="text-xs text-muted mt-1 max-w-[200px]">
                Speak directly with our kitchen manager for immediate queries.
              </p>
              <span className="text-base font-extrabold text-saffron mt-4 group-hover:underline">
                {phone}
              </span>
            </div>
          </a>

          {/* Email Card */}
          <a 
            href={`mailto:${email}`}
            className="group block bg-surface border border-border hover:border-saffron/40 rounded-2xl p-8 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-saffron/5 group-hover:bg-saffron/10 transition-colors duration-300 blur-xl" />
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-saffron/10 text-saffron flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-ink uppercase tracking-wide">Email Inquiries</h3>
              <p className="text-xs text-muted mt-1 max-w-[200px]">
                Send us feedback, partnership proposals, or catering queries.
              </p>
              <span className="text-base font-extrabold text-saffron mt-4 group-hover:underline break-all">
                {email}
              </span>
            </div>
          </a>

        </div>

        {/* Additional details */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 mt-12 text-muted text-xs font-semibold uppercase tracking-wider text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <MapPin size={14} className="text-saffron" />
            <span>Singarayakonda, Andhra Pradesh</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <Clock size={14} className="text-saffron" />
            <span>Open daily: 11:00 AM - 11:00 PM</span>
          </div>
        </div>

      </main>
    </div>
  );
}
