"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this path points to your firebase setup

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

  // Form & UI State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Capacity & Inventory States
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(true);

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Check Inventory on Load
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        setIsCheckingInventory(true);
        // 1. Get the max capacity for this specific tier from settings
        const capDoc = await getDoc(doc(db, "settings", "capacities"));
        const maxAllowed = capDoc.exists() ? capDoc.data()[selectedTicket.id] : 9999;

        // 2. Count how many of these specific tickets are currently in the database
        const q = query(collection(db, "tickets"), where("tier", "==", selectedTicket.id));
        const snapshot = await getCountFromServer(q);
        const totalSold = snapshot.data().count;

        // 3. If sold equals or exceeds the limit, trigger the sold-out state
        if (totalSold >= maxAllowed) {
          setIsSoldOut(true);
        } else {
          setIsSoldOut(false);
        }
      } catch (error) {
        console.error("Failed to verify inventory:", error);
      } finally {
        setIsCheckingInventory(false);
      }
    };

    checkAvailability();
  }, [selectedTicket.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(ticketCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000); // Reset to "Copy" after 3 seconds
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSoldOut) return; // Extra guard
    setIsProcessing(true);

    try {
      // 1. Generate a random 7-digit code for the ticket
      const newTicketCode = Math.floor(1000000 + Math.random() * 9000000).toString();

      // 2. Map the text capacity to an actual number for the database
      const capacityMap: Record<string, number> = {
        'regular': 1,
        'couples': 2,
        'table': 5
      };
      const totalCapacity = capacityMap[selectedTicket.id] || 1;

      // 3. Save to Firebase Firestore
      await setDoc(doc(db, "tickets", newTicketCode), {
        buyerName: formData.name,
        email: formData.email,
        phone: formData.phone,
        tier: selectedTicket.id,
        price: selectedTicket.price,
        totalCapacity: totalCapacity,
        admissionsUsed: 0,
        status: 'paid', // Note: In production, set this to 'paid' ONLY after payment gateway success
        createdAt: new Date().toISOString()
      });

      // 3. Save to Firebase Firestore (Your existing code)
      await setDoc(doc(db, "tickets", newTicketCode), {
        buyerName: formData.name,
        // ... rest of your save logic
      });

      // 4. TRIGGER RESEND EMAIL API
      await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          ticketCode: newTicketCode,
          tierName: selectedTicket.name,
          capacity: selectedTicket.capacity
        })
      });

      // 5. Trigger the custom Success Modal (Your existing code)
      setTicketCode(newTicketCode);
      setShowSuccessModal(true);
      
      // Clear the form
      setFormData({ name: '', email: '', phone: '' });

    } catch (error) {
      console.error("Error saving ticket to Firebase:", error);
      alert("There was an issue processing your ticket. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f041a] text-zinc-50 font-sans selection:bg-purple-500 selection:text-white relative">
      
      {/* LEFT SIDE - Ticket Summary (Dark Theme) */}
      <div className="md:w-1/2 lg:w-5/12 bg-gradient-to-b from-[#1b0a33] to-[#0f041a] border-b md:border-b-0 md:border-r border-purple-900/50 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center text-purple-300 hover:text-white transition-colors mb-12 md:mb-16 text-sm font-medium">
            ← Back to Home
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
              disabled={isProcessing || isSoldOut || isCheckingInventory}
              className="w-full mt-4 py-4 bg-[#1b0a33] text-white font-bold uppercase tracking-widest text-sm rounded-lg hover:bg-[#2d1557] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-[#1b0a33]"
            >
              {isCheckingInventory 
                ? 'Checking Availability...' 
                : isSoldOut 
                  ? 'SOLD OUT' 
                  : isProcessing 
                    ? 'Processing...' 
                    : `Pay ₦${selectedTicket.price.toLocaleString()}`}
            </button>
            
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className={`w-2 h-2 block rounded-full ${isSoldOut ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
              <p className="text-center text-xs text-zinc-400 font-medium">
                {isSoldOut ? 'Capacity Reached' : 'Secured Payment Processing'}
              </p>
            </div>
          </form>
        </div>

      </div>

      {/* SUCCESS MODAL OVERLAY */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#120a1c] border border-purple-900/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in duration-200">
            
            {/* Green Check Icon */}
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-serif text-white mb-2">Payment Secured</h2>
            <p className="text-gray-400 text-sm mb-6">
              Your registration is confirmed. Please save your unique check-in code below.
            </p>

            {/* Ticket Code Display */}
            <div className="bg-[#0b0612] w-full py-4 rounded-xl border border-white/5 mb-6">
              <span className="text-4xl font-bold tracking-widest text-purple-400">
                {ticketCode}
              </span>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={handleCopyCode}
                className="w-full py-3 rounded-lg font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
              >
                {isCopied ? "Code Copied!" : "Copy Ticket Code"}
              </button>
              
              <Link
                href="/"
                className="w-full py-3 flex items-center justify-center rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
              >
                Return to Home
              </Link>
            </div>
            
          </div>
        </div>
      )}

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