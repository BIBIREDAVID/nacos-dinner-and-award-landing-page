"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Dashboard States
  const [stats, setStats] = useState({ totalSold: 0, admitted: 0, revenue: 0 });
  const [tierStats, setTierStats] = useState({ regular: 0, couples: 0, table: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Settings States
  const [caps, setCaps] = useState({ regular: 0, couples: 0, table: 0 });
  const [isEditingCaps, setIsEditingCaps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auth States
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Manual Minting States
  const [showManualModal, setShowManualModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [manualData, setManualData] = useState({ 
    name: '', email: '', phone: '', tier: 'regular', type: 'comp' 
  });

  useEffect(() => {
    // Security Check
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/admin');
      else { setIsAuthorized(true); setIsAuthLoading(false); }
    });

    // Listen to Data
    const q = query(collection(db, "tickets"));
    const unsubscribeStats = onSnapshot(q, (snapshot) => {
      let sold = 0; let used = 0; let rev = 0;
      let regularSold = 0; let couplesSold = 0; let tableSold = 0;
      const txs: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sold += 1;
        used += data.admissionsUsed || 0;
        rev += data.price || 0;
        
        if (data.tier === 'regular') regularSold += 1;
        if (data.tier === 'couples') couplesSold += 1;
        if (data.tier === 'table') tableSold += 1;

        txs.push({ id: doc.id, ...data });
      });

      txs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setStats({ totalSold: sold, admitted: used, revenue: rev });
      setTierStats({ regular: regularSold, couples: couplesSold, table: tableSold });
      setTransactions(txs);
    });

    const fetchCaps = async () => {
      const capDoc = await getDoc(doc(db, "settings", "capacities"));
      if (capDoc.exists()) setCaps(capDoc.data() as any);
      else {
        const defaults = { regular: 200, couples: 50, table: 10 };
        await setDoc(doc(db, "settings", "capacities"), defaults);
        setCaps(defaults);
      }
    };
    
    fetchCaps();

    return () => { unsubscribeAuth(); unsubscribeStats(); };
  }, [router]);

  const handleSaveCaps = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "capacities"), caps);
      setIsEditingCaps(false);
    } catch (error) { alert("Failed to save settings."); } 
    finally { setIsSaving(false); }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return alert("No transactions to export.");
    const headers = ["Guest Name", "Email", "Phone", "Ticket Code", "Tier", "Amount (NGN)", "Status", "Date"];
    const rows = transactions.map(tx => [ `"${tx.buyerName || ''}"`, `"${tx.email || ''}"`, `"${tx.phone || ''}"`, `"${tx.id}"`, `"${tx.tier}"`, tx.price, `"${tx.status}"`, `"${new Date(tx.createdAt).toLocaleString()}"` ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nacos-dinner-tickets.csv";
    link.click();
  };

  // --- NEW: Resend Email Function ---
  const handleResendEmail = async (tx: any) => {
    if (!confirm(`Resend ticket email to ${tx.email}?`)) return;
    
    try {
      const res = await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tx.email,
          name: tx.buyerName,
          ticketCode: tx.id, // The document ID is the 7-digit code
          tierName: tx.tier,
          capacity: tx.totalCapacity
        })
      });
      
      if (res.ok) {
        alert('Ticket successfully resent!');
      } else {
        alert('Failed to resend ticket. Ensure email API is configured.');
      }
    } catch (error) {
      alert('Network error while resending.');
    }
  };

  // --- Manual Mint Function ---
  const handleManualMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    try {
      const newTicketCode = Math.floor(1000000 + Math.random() * 9000000).toString();
      const capacityMap: Record<string, number> = { 'regular': 1, 'couples': 2, 'table': 5 };
      const priceMap: Record<string, number> = { 'regular': 5000, 'couples': 15000, 'table': 50000 };
      
      // If Comp, price is 0. If Cash, apply full price.
      const ticketPrice = manualData.type === 'comp' ? 0 : priceMap[manualData.tier];

      await setDoc(doc(db, "tickets", newTicketCode), {
        buyerName: manualData.name,
        email: manualData.email || 'admin-generated@nacos.com',
        phone: manualData.phone || 'N/A',
        tier: manualData.tier,
        price: ticketPrice,
        totalCapacity: capacityMap[manualData.tier] || 1,
        admissionsUsed: 0,
        status: manualData.type === 'comp' ? 'COMP' : 'PAID (CASH)',
        squadRef: `MANUAL_${manualData.type.toUpperCase()}_${Date.now()}`,
        createdAt: new Date().toISOString()
      });

      alert(`Ticket successfully generated! Code: ${newTicketCode}\nPlease write this down or share it with the guest.`);
      setShowManualModal(false);
      setManualData({ name: '', email: '', phone: '', tier: 'regular', type: 'comp' });
    } catch (error) {
      alert("Failed to generate ticket.");
      console.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    (tx.buyerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (tx.id || '').includes(searchTerm) ||
    (tx.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (isAuthLoading || !isAuthorized) return <div className="min-h-screen bg-[#0a0514]"></div>;

  return (
    <div className="min-h-screen bg-[#0a0514] p-6 md:p-12 text-white font-sans selection:bg-purple-500 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-purple-900/40 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Gala Command Center</h1>
            <p className="text-zinc-500 text-sm mt-1">Live Event Telemetry & Operations</p>
          </div>
          <nav className="flex items-center space-x-3 text-sm font-medium">
            <span className="text-white bg-purple-600/20 border border-purple-500/30 px-4 py-2 rounded-lg">Dashboard</span>
            <Link href="/admin/scanner" className="text-purple-400 hover:text-white px-4 py-2 transition-colors">Scanner</Link>
            <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 font-bold border border-red-900/50 bg-red-900/20 px-4 py-2 rounded-lg transition-colors">Logout</button>
          </nav>
        </div>
        
        {/* Hero KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#150a26] to-[#0a0514] p-6 rounded-2xl border border-purple-900/50 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
            <p className="text-purple-300/70 text-xs font-bold tracking-widest uppercase mb-2">Total Tickets Sold</p>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-bold">{stats.totalSold}</p>
              <span className="text-zinc-500 text-sm font-medium">guests</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#150a26] to-[#0a0514] p-6 rounded-2xl border border-purple-900/50 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <p className="text-purple-300/70 text-xs font-bold tracking-widest uppercase mb-2">Admitted (Checked-In)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-bold text-white">{stats.admitted}</p>
              <span className="text-zinc-500 text-sm font-medium">/ {stats.totalSold} total</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#111a14] to-[#0a0514] p-6 rounded-2xl border border-green-900/50 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
            <p className="text-green-400/70 text-xs font-bold tracking-widest uppercase mb-2">Gross Revenue</p>
            <p className="text-5xl font-bold text-green-400 tracking-tight">₦{stats.revenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Capacity Analytics */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e]">
            <h2 className="text-xl font-serif">Capacity & Inventory</h2>
            {!isEditingCaps ? (
              <button onClick={() => setIsEditingCaps(true)} className="text-xs font-bold bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-800 px-4 py-2 rounded-lg transition-colors">
                EDIT LIMITS
              </button>
            ) : (
              <button onClick={handleSaveCaps} disabled={isSaving} className="text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            )}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 'regular', name: 'Regular Pass', sold: tierStats.regular, cap: caps.regular, color: 'bg-purple-500' },
              { id: 'couples', name: 'Couples Pass', sold: tierStats.couples, cap: caps.couples, color: 'bg-pink-500' },
              { id: 'table', name: 'Table of 5', sold: tierStats.table, cap: caps.table, color: 'bg-amber-500' }
            ].map((tier) => {
              const percent = tier.cap > 0 ? Math.min(100, Math.round((tier.sold / tier.cap) * 100)) : 0;
              return (
                <div key={tier.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold">{tier.name}</p>
                    {isEditingCaps ? (
                      <input 
                        type="number" value={caps[tier.id as keyof typeof caps]} 
                        onChange={(e) => setCaps({...caps, [tier.id]: Number(e.target.value)})}
                        className="w-20 bg-[#0a0514] border border-purple-600 rounded px-2 py-1 text-white text-sm focus:outline-none text-right"
                      />
                    ) : (
                      <p className="text-sm font-bold text-white">{tier.sold} <span className="text-zinc-600">/ {tier.cap}</span></p>
                    )}
                  </div>
                  <div className="w-full bg-[#0a0514] rounded-full h-2.5 border border-purple-900/30 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${tier.color} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                  </div>
                  <p className="text-right text-[10px] text-zinc-500 font-mono">{percent}% Sold Out</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden flex flex-col">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e] gap-4">
            <h2 className="text-xl font-serif">Recent Transactions</h2>
            
            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 bg-[#0a0514] border border-purple-800/50 text-sm text-white rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-zinc-500 hover:text-white">✕</button>
                )}
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowManualModal(true)} 
                  className="flex-1 sm:flex-none text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-purple-900/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Mint Ticket
                </button>

                <button 
                  onClick={handleExportCSV} 
                  disabled={transactions.length === 0} 
                  className="flex-1 sm:flex-none text-sm font-bold bg-green-600/20 border border-green-600/50 hover:bg-green-600 text-green-400 hover:text-white px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export CSV
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-[#0f071c] text-[10px] uppercase tracking-widest text-zinc-500 border-b border-purple-900/30">
                <tr>
                  <th className="px-6 py-4 font-bold">Guest Profile</th>
                  <th className="px-6 py-4 font-bold">Ticket Code</th>
                  <th className="px-6 py-4 font-bold">Tier</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th> {/* NEW ACTIONS HEADER */}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/20">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-purple-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white group-hover:text-purple-300 transition-colors">{tx.buyerName}</p>
                      <p className="text-xs text-zinc-500">{tx.email}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-purple-400 bg-purple-900/5 rounded inline-block mt-4 ml-6 px-2 py-1">{tx.id}</td>
                    <td className="px-6 py-4 capitalize font-medium">{tx.tier}</td>
                    <td className="px-6 py-4 font-medium">₦{tx.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold border tracking-wider
                        ${tx.status.includes('COMP') ? 'bg-blue-900/20 text-blue-400 border-blue-900/30' : 
                          'bg-green-900/20 text-green-400 border-green-900/30'}`}>
                        {tx.status}
                      </span>
                    </td>
                    {/* NEW RESEND EMAIL BUTTON */}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleResendEmail(tx)}
                        className="p-2 bg-purple-900/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded transition-colors"
                        title="Resend Ticket Email"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      {searchTerm ? 'No guests found matching your search.' : 'No transactions recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Manual Minting Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#150a26] border border-purple-900/50 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-serif text-white mb-2">Mint Manual Ticket</h2>
            <p className="text-zinc-400 text-sm mb-6">Generate an instant code without payment gateways.</p>
            
            <form onSubmit={handleManualMint} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Guest Name</label>
                <input required type="text" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" placeholder="E.g. Dr. John Doe" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Ticket Tier</label>
                  <select value={manualData.tier} onChange={e => setManualData({...manualData, tier: e.target.value})} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none">
                    <option value="regular">Regular</option>
                    <option value="couples">Couples</option>
                    <option value="table">Table of 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Payment Type</label>
                  <select value={manualData.type} onChange={e => setManualData({...manualData, type: e.target.value})} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none">
                    <option value="comp">VIP / Comp</option>
                    <option value="cash">Cash at Door</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-purple-900/30">
                <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 py-3 bg-transparent border border-purple-900 hover:bg-purple-900/30 text-white font-bold rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isMinting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/20">
                  {isMinting ? 'Minting...' : 'Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}