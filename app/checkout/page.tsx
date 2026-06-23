"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');

  // Ticket Tier Configuration
  const ticketData = {
    regular: { name: 'Standard Pass', price: 5000, capacity: '1 Guest', id: 'regular' },
    couples: { name: 'Couples Pass', price: 15000, capacity: '2 Guests', id: 'couples' },
    table: { name: 'Table of 5', price: 50000, capacity: '5 Guests', id: 'table' },
  };

  // Fallback to regular if no valid tier is passed in the URL
  const selectedTicket = ticketData[tierParam as keyof typeof ticketData] || ticketData.regular;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate Paystack or Flutterwave API here
    console.log("Processing payment for:", { ...formData, ticket: selectedTicket });
    alert(`Payment triggered for ${formData.name} - ₦${selectedTicket.price.toLocaleString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f041a] text-zinc-50 font-sans selection:bg-purple-500 selection:text-white">
      
      {/* LEFT SIDE - Ticket Summary (Dark Theme) */}
      <div className="md:w-1/2 lg:w-5/12 bg-gradient-to-b from-[#1b0a33] to-[#0f041a] border-b md:border-b-0 md:border-r border-purple-900/50 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center text-purple-300 hover:text-white transition-colors mb-12 md:mb-16 text-sm font-medium">
            ← Back to Landing
          </Link>
          
          <p className="text-[#d46b53] text-xs font-bold tracking-widest uppercase mb-4">Order Summary</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-2">{selectedTicket.name}</h2>
          <p className="text-purple-200/60 font-mono text-sm mb-8 md:mb-12">Admit: {selectedTicket.capacity}</p>

          <div className="space-y-4 border-t border-purple-800/40 pt-6">
            <div className="flex justify-between text-purple-100 text-sm md:text-base">
              <span>Ticket Tier</span>
              <span className="capitalize font-medium">{selectedTicket.id}</span>
            </div>
            <div className="flex justify-between text-purple-100 text-sm md:text-base">
              <span>Subtotal</span>
              <span className="font-medium">₦{selectedTicket.price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-purple-800/40 pt-6 mt-8 flex justify-between items-end relative z-10">
          <span className="text-sm text-purple-300/60">Total to pay</span>
          <span className="text-3xl md:text-4xl font-bold text-white">₦{selectedTicket.price.toLocaleString()}</span>
        </div>
      </div>

      {/* RIGHT SIDE - Checkout Form (Light Theme) */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-8 md:p-12 lg:p-20 bg-[#f6f5f2] text-zinc-900 flex flex-col justify-center">
        
        <div className="max-w-md w-full mx-auto md:mx-0">
          <h1 className="text-2xl md:text-3xl font-serif tracking-tight mb-2">Guest Details</h1>
          <p className="text-zinc-600 text-sm mb-8 leading-relaxed">
            Enter your information below. Your receipt and unique 7-digit check-in code will be sent to this email address.
          </p>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 transition-all text-zinc-900 shadow-sm"
                placeholder="E.g. David Bibire"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 transition-all text-zinc-900 shadow-sm"
                placeholder="david@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 transition-all text-zinc-900 shadow-sm"
                placeholder="09012345678"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-4 bg-[#1b0a33] text-white font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-[#2d1557] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
            >
              Pay ₦{selectedTicket.price.toLocaleString()}
            </button>
            
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="w-2 h-2 block rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-center text-xs text-zinc-400 font-medium">Secured Payment Processing</p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

// Wrapping in Suspense is a Next.js best practice when using useSearchParams
// This ensures the page doesn't break during the static build process
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f041a] text-purple-300 font-mono text-sm">
        Loading secure checkout...
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}