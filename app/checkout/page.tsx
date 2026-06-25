"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { doc, setDoc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fix #2: cryptographically secure ticket code (browser-safe via Web Crypto API)
function generateTicketCode(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

declare global { interface Window { squad: any; } }

function CheckoutContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');

  const TRANSACTION_FEE = 100; // Fixed Service Fee

  // Set NEXT_PUBLIC_TEST_MODE=true in Vercel to use ₦100 for Regular (live payment test).
  // Remove or set to false to restore the real ₦5,000 price.
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

  const ticketData = {
    regular: { name: isTestMode ? 'Standard Pass (TEST)' : 'Standard Pass', price: isTestMode ? 100 : 100, capacity: '1 Guest', id: 'regular' },
    couples: { name: 'Couples Pass', price: 15000, capacity: '2 Guests', id: 'couples' },
    table:   { name: 'Table of 5',   price: 50000, capacity: '5 Guests', id: 'table'   },
  };

  const selectedTicket = ticketData[tierParam as keyof typeof ticketData] || ticketData.regular;

  // States
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dynamic Calculations
  const subtotal = selectedTicket.price * quantity;
  const totalToPay = subtotal + TRANSACTION_FEE;

  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ticketCode, setTicketCode] = useState('');

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        setIsCheckingInventory(true);
        const capDoc = await getDoc(doc(db, "settings", "capacities"));
        const maxAllowed = capDoc.exists() ? capDoc.data()[selectedTicket.id] : 9999;
        const q = query(collection(db, "tickets"), where("tier", "==", selectedTicket.id));
        const snapshot = await getCountFromServer(q);
        setIsSoldOut(snapshot.data().count >= maxAllowed);
      } catch (error) { console.error(error); } finally { setIsCheckingInventory(false); }
    };
    checkAvailability();
  }, [selectedTicket.id]);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSoldOut || !window.squad) return;
    setIsProcessing(true);

    const squadInstance = new window.squad({
      key: process.env.NEXT_PUBLIC_SQUAD_PUBLIC_KEY,
      email: formData.email,
      amount: totalToPay * 100, // Squad uses Kobo
      currency_code: "NGN",
      customer_name: formData.name,
      onSuccess: async (response: any) => {
        try {
          // Fix #2: use Web Crypto API for secure ticket codes
          const newTicketCode = generateTicketCode();
          const baseCapacity = parseInt(selectedTicket.capacity.split(' ')[0]);

          await setDoc(doc(db, "tickets", newTicketCode), {
            buyerName: formData.name,
            email: formData.email,
            phone: formData.phone,
            tier: selectedTicket.id,
            price: subtotal,        // Ticket Revenue
            fee: TRANSACTION_FEE,   // Fee Revenue
            totalPaid: totalToPay,  // Combined Ledger
            quantity: quantity,
            totalCapacity: baseCapacity * quantity,
            admissionsUsed: 0,
            status: 'paid',
            squadRef: response.reference,
            createdAt: new Date().toISOString()
          });

          setTicketCode(newTicketCode);
          setShowSuccessModal(true);
        } catch (error: any) {
          // Show the actual error so we can diagnose it
          const msg = error?.message || error?.code || JSON.stringify(error) || 'Unknown error';
          alert(`Payment successful, but ticket creation failed.\n\nError: ${msg}`);
          console.error('Ticket creation error:', error);
        }
        finally { setIsProcessing(false); }
      },
      onClose: () => setIsProcessing(false)
    });
    squadInstance.setup();
    squadInstance.open();
  };

  return (
    <>
      <Script src="https://checkout.squadco.com/widget/squad.min.js" strategy="lazyOnload" />
      <div className="min-h-screen flex flex-col md:flex-row bg-[#0f041a] text-zinc-50 font-sans">
        
        {/* Left Side: Summary */}
        <div className="md:w-1/2 bg-gradient-to-b from-[#1b0a33] to-[#0f041a] p-8 md:p-12 border-r border-purple-900/50">
          <Link href="/" className="text-purple-300 text-sm block mb-12">← Back to Home</Link>
          <p className="text-purple-300/60 text-xs font-mono uppercase tracking-widest mb-2">Order Summary</p>
          <h2 className="text-4xl font-serif mb-8">{selectedTicket.name}</h2>

          <div className="space-y-3 text-sm">
            {/* Ticket line */}
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">{selectedTicket.name} × {quantity}</span>
              <span className="text-white font-medium">₦{subtotal.toLocaleString()}</span>
            </div>

            {/* Fee line — clearly broken out */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Service fee</span>
                <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded-full font-mono">Platform charge</span>
              </div>
              <span className="text-blue-400 font-medium">₦{TRANSACTION_FEE.toLocaleString()}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-purple-800/60 pt-3 mt-1">
              <div className="flex justify-between items-baseline">
                <span className="text-white font-bold text-lg">Total</span>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white">₦{totalToPay.toLocaleString()}</span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">= ₦{subtotal.toLocaleString()} + ₦{TRANSACTION_FEE} fee</p>
                </div>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="mt-8 p-4 rounded-xl bg-white/5 border border-purple-800/30 text-xs text-zinc-400 space-y-1.5">
            <p className="text-purple-300 font-bold uppercase tracking-widest text-[10px] mb-2">What's included</p>
            <p>✓ Unique check-in code sent to your email</p>
            <p>✓ Entry for {selectedTicket.capacity}</p>
            <p>✓ Red carpet access</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-8 md:p-12 bg-[#f6f5f2] text-zinc-900">
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Quantity</label>
              <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full p-3 border rounded-lg bg-white">
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Ticket{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <input required placeholder="Full Name" className="w-full p-3 border rounded-lg" onChange={(e) => setFormData({...formData, name: e.target.value})}/>
            <input required type="email" placeholder="Email" className="w-full p-3 border rounded-lg" onChange={(e) => setFormData({...formData, email: e.target.value})}/>
            <input required type="tel" placeholder="Phone" className="w-full p-3 border rounded-lg" onChange={(e) => setFormData({...formData, phone: e.target.value})}/>
            <button type="submit" className="w-full py-4 bg-[#1b0a33] text-white font-bold uppercase tracking-widest text-sm rounded-lg">
              Pay ₦{totalToPay.toLocaleString()}
            </button>
          </form>
        </div>
      </div>
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#120a1c] border border-purple-900/30 rounded-2xl p-8 max-w-sm w-full text-center">
            <h2 className="text-2xl font-serif text-white mb-4">Payment Secured</h2>
            <div className="bg-[#0b0612] py-4 rounded-xl mb-6 text-4xl font-bold text-purple-400 tracking-widest">{ticketCode}</div>
            <button onClick={() => setShowSuccessModal(false)} className="w-full py-3 bg-purple-600 rounded-lg text-white font-bold">Done</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div>Loading...</div>}><CheckoutContent /></Suspense>;
}