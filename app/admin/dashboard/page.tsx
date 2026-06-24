"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalSold: 0, admitted: 0, revenue: 0 });

  useEffect(() => {
    // Listen to the 'tickets' collection in real-time
    const q = query(collection(db, "tickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sold = 0;
      let used = 0;
      let rev = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        sold += 1;
        used += data.admissionsUsed || 0;
        rev += data.price || 0; // Ensure your checkout saves the price field
      });

      setStats({ totalSold: sold, admitted: used, revenue: rev });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0514] p-8 text-white">
      <h1 className="text-3xl font-bold mb-8 text-purple-400">Gala Command Center</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900">
          <p className="text-purple-300 text-sm">Tickets Sold</p>
          <p className="text-4xl font-bold">{stats.totalSold}</p>
        </div>
        <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900">
          <p className="text-purple-300 text-sm">Admitted Guests</p>
          <p className="text-4xl font-bold">{stats.admitted}</p>
        </div>
        <div className="bg-[#150a26] p-6 rounded-2xl border border-purple-900">
          <p className="text-purple-300 text-sm">Total Revenue</p>
          <p className="text-4xl font-bold">₦{stats.revenue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}