"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  
  const [stats, setStats] = useState({ totalSold: 0, admitted: 0, revenue: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [caps, setCaps] = useState({ regular: 0, couples: 0, table: 0 });
  const [isEditingCaps, setIsEditingCaps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // 1. Real Firebase Security Check
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin'); // Kick out if not logged in
      } else {
        setIsAuthorized(true);
        setIsAuthLoading(false); // Let them see the dashboard
      }
    });

    // 2. Listen to Live Ticket Stats & Transactions
    const q = query(collection(db, "tickets"));
    const unsubscribeStats = onSnapshot(q, (snapshot) => {
      let sold = 0; let used = 0; let rev = 0;
      const txs: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sold += 1;
        used += data.admissionsUsed || 0;
        rev += data.price || 0;
        txs.push({ id: doc.id, ...data });
      });

      // Sort transactions so the newest ones appear at the top
      txs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setStats({ totalSold: sold, admitted: used, revenue: rev });
      setTransactions(txs);
    });

    // 3. Fetch Capacity Settings
    const fetchCaps = async () => {
      const capDoc = await getDoc(doc(db, "settings", "capacities"));
      if (capDoc.exists()) {
        setCaps(capDoc.data() as { regular: number, couples: number, table: number });
      } else {
        const defaults = { regular: 200, couples: 50, table: 10 };
        await setDoc(doc(db, "settings", "capacities"), defaults);
        setCaps(defaults);
      }
    };
    
    fetchCaps();

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeAuth();
      unsubscribeStats();
    };
  }, [router]);

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

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    // 1. Create CSV Headers
    const headers = ["Guest Name", "Email", "Phone", "Ticket Code", "Tier", "Amount (NGN)", "Status", "Date"];

    // 2. Map data to rows
    const rows = transactions.map(tx => [
      `"${tx.buyerName || ''}"`,
      `"${tx.email || ''}"`,
      `"${tx.phone || ''}"`,
      `"${tx.id}"`,
      `"${tx.tier}"`,
      tx.price,
      `"${tx.status}"`,
      `"${new Date(tx.createdAt).toLocaleString()}"`
    ]);

    // 3. Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    // 4. Trigger browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "nacos-dinner-tickets.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prevent UI flash while checking authentication
  if (isAuthLoading || !isAuthorized) {
    return <div className="min-h-screen bg-[#0a0514]"></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0514] p-6 md:p-12 text-white font-sans selection:bg-purple-500">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Navigation Menu */}
        <div className="flex justify-between items-center mb-10 border-b border-purple-900/40 pb-4">
          <h1 className="text-3xl font-serif font-bold text-purple-400">Gala Command Center</h1>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <span className="text-white bg-purple-900/50 px-3 py-1 rounded-full">Dashboard</span>
            <Link href="/admin/scanner" className="text-purple-400 hover:text-white transition-colors">Scanner</Link>
            
            {/* Logout Button */}
            <button 
              onClick={() => signOut(auth)} 
              className="text-red-400 hover:text-red-300 transition-colors ml-4 font-bold border border-red-900/50 bg-red-900/20 px-3 py-1 rounded"
            >
              Logout
            </button>
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
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden mb-12">
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

        {/* Transaction Ledger with CSV Export */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e]">
            <h2 className="text-xl font-serif">Recent Transactions</h2>
            
            <button
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="text-sm font-bold bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-[#0a0514] text-xs uppercase text-zinc-500 border-b border-purple-900/30">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Guest Name</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Ticket Code</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Tier</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Amount</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/20">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-purple-900/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{tx.buyerName}</td>
                    <td className="px-6 py-4 font-mono text-purple-400">{tx.id}</td>
                    <td className="px-6 py-4 capitalize">{tx.tier}</td>
                    <td className="px-6 py-4">₦{tx.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}