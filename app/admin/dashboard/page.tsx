"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalSold: 0, admitted: 0, revenue: 0 });
  const [caps, setCaps] = useState({ regular: 0, couples: 0, table: 0 });
  const [isEditingCaps, setIsEditingCaps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 1. Listen to Live Ticket Stats
    const q = query(collection(db, "tickets"));
    const unsubscribeStats = onSnapshot(q, (snapshot) => {
      let sold = 0; let used = 0; let rev = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        sold += 1;
        used += data.admissionsUsed || 0;
        rev += data.price || 0;
      });
      setStats({ totalSold: sold, admitted: used, revenue: rev });
    });

    // 2. Fetch Capacity Settings
    const fetchCaps = async () => {
      const capDoc = await getDoc(doc(db, "settings", "capacities"));
      if (capDoc.exists()) {
        setCaps(capDoc.data() as { regular: number, couples: number, table: number });
      } else {
        // Initialize default limits if the document doesn't exist yet
        const defaults = { regular: 200, couples: 50, table: 10 };
        await setDoc(doc(db, "settings", "capacities"), defaults);
        setCaps(defaults);
      }
    };
    fetchCaps();

    return () => unsubscribeStats();
  }, []);

  const handleSaveCaps = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "capacities"), caps);
      setIsEditingCaps(false);
    } catch (error) {
      console.error("Error saving capacities", error);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0514] p-6 md:p-12 text-white font-sans selection:bg-purple-500">
      <div className="max-w-5xl mx-auto">
        
        {/* Top Navigation Menu */}
        <div className="flex justify-between items-center mb-10 border-b border-purple-900/40 pb-4">
          <h1 className="text-3xl font-serif font-bold text-purple-400">Gala Command Center</h1>
          <nav className="space-x-4 text-sm font-medium">
            <span className="text-white bg-purple-900/50 px-3 py-1 rounded-full">Dashboard</span>
            <Link href="/admin/scanner" className="text-purple-400 hover:text-white transition-colors">Scanner</Link>
          </nav>
        </div>
        
        {/* Live Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900/50 shadow-xl">
            <p className="text-purple-300/70 text-sm font-bold tracking-wider uppercase mb-1">Tickets Sold</p>
            <p className="text-4xl font-bold">{stats.totalSold}</p>
          </div>
          <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900/50 shadow-xl">
            <p className="text-purple-300/70 text-sm font-bold tracking-wider uppercase mb-1">Admitted Guests</p>
            <p className="text-4xl font-bold">{stats.admitted}</p>
          </div>
          <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900/50 shadow-xl">
            <p className="text-purple-300/70 text-sm font-bold tracking-wider uppercase mb-1">Total Revenue</p>
            <p className="text-4xl font-bold text-green-400">₦{stats.revenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Capacity Controls */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e]">
            <h2 className="text-xl font-serif">Ticket Capacity Limits</h2>
            {!isEditingCaps ? (
              <button onClick={() => setIsEditingCaps(true)} className="text-sm font-bold text-purple-400 hover:text-white transition-colors">
                EDIT LIMITS
              </button>
            ) : (
              <button onClick={handleSaveCaps} disabled={isSaving} className="text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50">
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            )}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {['regular', 'couples', 'table'].map((tier) => (
              <div key={tier} className="bg-[#0a0514] p-4 rounded-xl border border-purple-900/30">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{tier} Pass Cap</p>
                {isEditingCaps ? (
                  <input 
                    type="number" 
                    value={caps[tier as keyof typeof caps]} 
                    onChange={(e) => setCaps({...caps, [tier]: Number(e.target.value)})}
                    className="w-full bg-[#150a26] border border-purple-600 rounded px-3 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                ) : (
                  <p className="text-2xl font-bold text-white">{caps[tier as keyof typeof caps]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}