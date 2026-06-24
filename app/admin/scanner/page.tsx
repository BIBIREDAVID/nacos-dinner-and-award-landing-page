"use client";

import React, { useState } from 'react';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function ScannerPage() {
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setTicketData(null);

    try {
      const ticketRef = doc(db, 'tickets', scanCode.trim());
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        setMessage({ type: 'error', text: 'Invalid Code: Ticket does not exist.' });
        setLoading(false);
        return;
      }

      const data = ticketSnap.data();

      // Rule 1: Check Payment Status
      if (data.status !== 'paid') {
        setMessage({ type: 'error', text: `Access Denied: Ticket status is ${data.status.toUpperCase()}` });
      } 
      // Rule 2: Check Capacity
      else if (data.admissionsUsed >= data.totalCapacity) {
        setMessage({ type: 'error', text: 'Access Denied: All admissions for this ticket have been used.' });
      } 
      // Passed: Valid Ticket
      else {
        setMessage({ type: 'success', text: 'Ticket Valid! Ready for Check-in.' });
      }

      setTicketData({ id: ticketSnap.id, ...data });

    } catch (error) {
      console.error("Error fetching ticket:", error);
      setMessage({ type: 'error', text: 'Connection error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticketData) return;
    setLoading(true);

    try {
      const ticketRef = doc(db, 'tickets', ticketData.id);
      
      // Using increment() is a crucial security step. 
      // It prevents double-scanning if two ushers check the same ticket simultaneously.
      await updateDoc(ticketRef, {
        admissionsUsed: increment(1)
      });

      // Update local state to reflect the new scan without re-fetching
      setTicketData({
        ...ticketData,
        admissionsUsed: ticketData.admissionsUsed + 1
      });

      setMessage({ type: 'success', text: 'Guest Successfully Checked In!' });

    } catch (error) {
      console.error("Error checking in:", error);
      setMessage({ type: 'error', text: 'Failed to check in guest.' });
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanCode('');
    setTicketData(null);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0514] text-white p-6 md:p-12 font-sans selection:bg-purple-500">
      <div className="max-w-2xl mx-auto">
        
        {/* Top Navigation Menu */}
        <div className="flex justify-between items-center mb-10 border-b border-purple-900/40 pb-4">
          <h1 className="text-2xl font-serif">Gala Control Point</h1>
          <nav className="space-x-4 text-sm font-medium">
            <Link href="/admin/dashboard" className="text-purple-400 hover:text-white transition-colors">Dashboard</Link>
            <span className="text-white bg-purple-900/50 px-3 py-1 rounded-full">Scanner</span>
          </nav>
        </div>

        {/* Scanner Input Card */}
        <div className="bg-[#150a26] border border-purple-900/50 rounded-2xl p-8 shadow-2xl mb-8">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              required
              placeholder="Enter 7-Digit Ticket Code"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="flex-1 bg-[#0a0514] border border-purple-800/50 rounded-lg px-6 py-4 text-2xl text-center tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
              maxLength={7}
            />
            <button
              type="submit"
              disabled={loading || scanCode.length < 7}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading && !ticketData ? 'Searching...' : 'Lookup Ticket'}
            </button>
          </form>
        </div>

        {/* Validation Messages */}
        {message.text && !ticketData && (
          <div className={`p-4 rounded-lg mb-8 text-center font-bold ${message.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : ''}`}>
            {message.text}
          </div>
        )}

        {/* Ticket Details & Action Area */}
        {ticketData && (
          <div className="bg-[#150a26] border border-purple-900/50 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-purple-400 text-sm font-bold tracking-widest uppercase mb-1">Guest Name</p>
                <h2 className="text-3xl font-serif">{ticketData.buyerName}</h2>
                <p className="text-zinc-400 mt-1">{ticketData.email} • {ticketData.phone}</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-purple-900/40 text-purple-200 px-3 py-1 rounded border border-purple-800/50 text-xs uppercase font-bold tracking-wider">
                  {ticketData.tier} Tier
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#0a0514] p-4 rounded-xl border border-purple-900/30">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Capacity</p>
                <p className="text-2xl font-bold text-white">{ticketData.totalCapacity} Guests</p>
              </div>
              <div className="bg-[#0a0514] p-4 rounded-xl border border-purple-900/30">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Admitted So Far</p>
                <p className="text-2xl font-bold text-purple-400">{ticketData.admissionsUsed} Guests</p>
              </div>
            </div>

            {/* Dynamic Action Button */}
            {ticketData.admissionsUsed < ticketData.totalCapacity ? (
              <div className="space-y-4">
                {message.text && (
                  <div className="p-4 bg-green-900/30 text-green-400 border border-green-900/50 rounded-lg text-center font-medium">
                    {message.text}
                  </div>
                )}
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-green-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Admit 1 Guest'}
                </button>
              </div>
            ) : (
              <div className="p-6 bg-red-900/20 border border-red-900/50 rounded-xl text-center">
                <span className="text-red-500 font-bold text-xl block mb-1">CAPACITY REACHED</span>
                <span className="text-red-400/70 text-sm">No remaining admissions for this ticket code.</span>
              </div>
            )}

            <button
              onClick={resetScanner}
              className="w-full mt-6 py-3 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
            >
              Scan Another Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}