"use client";

import React, { useState } from 'react';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure you have your firebase setup here

export default function ScannerPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ticketRef = doc(db, "tickets", code);
      const docSnap = await getDoc(ticketRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.admissionsUsed < data.totalCapacity) {
          await updateDoc(ticketRef, { admissionsUsed: increment(1) });
          setStatus(`Success! Welcome, ${data.buyerName}. (${data.admissionsUsed + 1}/${data.totalCapacity})`);
        } else {
          setStatus("Access Denied: Ticket fully used.");
        }
      } else {
        setStatus("Invalid Code: Ticket not found.");
      }
    } catch (error) {
      setStatus("Error processing ticket.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0514] p-6 text-white">
      <h1 className="text-2xl font-bold mb-8">Admin Scanner</h1>
      <form onSubmit={handleScan} className="space-y-4">
        <input 
          className="w-full p-4 bg-[#150a26] border border-purple-900 rounded-lg"
          placeholder="Enter 7-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="w-full py-4 bg-purple-600 rounded-lg font-bold">Validate Ticket</button>
      </form>
      {status && <div className="mt-8 p-4 bg-purple-900/30 rounded border border-purple-500">{status}</div>}
    </div>
  );
}