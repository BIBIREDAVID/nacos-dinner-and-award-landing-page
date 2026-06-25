"use client";

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Crypto-secure ticket code
function generateTicketCode(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const TIER_CONFIG = {
  regular: { label: 'Regular Pass',  capacity: 1, price: 5000  },
  couples: { label: 'Couples Pass',  capacity: 2, price: 15000 },
  table:   { label: 'Table of 5',    capacity: 5, price: 50000 },
};

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export default function AdminDashboard() {
  const router = useRouter();

  // Auth
  const [isAuthorized, setIsAuthorized]   = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Data
  const [stats, setStats]             = useState({ totalSold: 0, admitted: 0, revenue: 0 });
  const [tierStats, setTierStats]     = useState({ regular: 0, couples: 0, table: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm]   = useState('');

  // Capacity settings
  const [caps, setCaps]               = useState({ regular: 200, couples: 50, table: 10 });
  const [isEditingCaps, setIsEditingCaps] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);

  // Expanded row
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [checkingIn, setCheckingIn]   = useState<string | null>(null);
  const [upgrading, setUpgrading]     = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<Record<string, string>>({});

  // Mint modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [isMinting, setIsMinting]     = useState(false);
  const [manualData, setManualData]   = useState({ name: '', email: '', phone: '', tier: 'regular', type: 'comp' });

  // Resend
  const [resending, setResending]     = useState<string | null>(null);

  useEffect(() => {
    // ── Auth gate ──────────────────────────────────────────────────────────────
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/admin'); return; }
      const email = user.email?.toLowerCase() || '';
      if (!ADMIN_EMAILS.includes(email)) { router.push('/admin/scanner'); return; }
      setIsAuthorized(true);
      setIsAuthLoading(false);
    });

    // ── Live ticket feed ───────────────────────────────────────────────────────
    const unsubscribeStats = onSnapshot(query(collection(db, 'tickets')), (snapshot) => {
      let sold = 0, used = 0, rev = 0;
      let regularSold = 0, couplesSold = 0, tableSold = 0;
      const txs: any[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        sold += 1;
        used += data.admissionsUsed || 0;
        rev  += data.totalPaid || data.price || 0;
        if (data.tier === 'regular') regularSold++;
        if (data.tier === 'couples') couplesSold++;
        if (data.tier === 'table')   tableSold++;
        txs.push({ id: d.id, ...data });
      });

      txs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setStats({ totalSold: sold, admitted: used, revenue: rev });
      setTierStats({ regular: regularSold, couples: couplesSold, table: tableSold });
      setTransactions(txs);
    });

    // ── Capacity defaults ──────────────────────────────────────────────────────
    (async () => {
      const capDoc = await getDoc(doc(db, 'settings', 'capacities'));
      if (capDoc.exists()) setCaps(capDoc.data() as any);
      else {
        const defaults = { regular: 200, couples: 50, table: 10 };
        await setDoc(doc(db, 'settings', 'capacities'), defaults);
        setCaps(defaults);
      }
    })();

    return () => { unsubscribeAuth(); unsubscribeStats(); };
  }, [router]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveCaps = async () => {
    setIsSaving(true);
    try { await setDoc(doc(db, 'settings', 'capacities'), caps); setIsEditingCaps(false); }
    catch { alert('Failed to save settings.'); }
    finally { setIsSaving(false); }
  };

  const handleCheckIn = async (tx: any) => {
    if (tx.admissionsUsed >= tx.totalCapacity) return;
    setCheckingIn(tx.id);
    try {
      await updateDoc(doc(db, 'tickets', tx.id), { admissionsUsed: increment(1) });
    } catch { alert('Check-in failed. Try again.'); }
    finally { setCheckingIn(null); }
  };

  const handleUpgrade = async (tx: any) => {
    const newTier = upgradeTier[tx.id];
    if (!newTier || newTier === tx.tier) return;
    if (!confirm(`Upgrade ${tx.buyerName} from "${tx.tier}" → "${newTier}"?`)) return;
    setUpgrading(tx.id);
    try {
      const cfg = TIER_CONFIG[newTier as keyof typeof TIER_CONFIG];
      await updateDoc(doc(db, 'tickets', tx.id), {
        tier: newTier,
        totalCapacity: cfg.capacity,
        price: cfg.price,
        upgradedAt: new Date().toISOString(),
        upgradedFrom: tx.tier,
      });
      setUpgradeTier((prev) => ({ ...prev, [tx.id]: newTier }));
      alert(`Ticket upgraded to ${cfg.label}!`);
    } catch { alert('Upgrade failed.'); }
    finally { setUpgrading(null); }
  };

  const handleResendEmail = async (tx: any) => {
    if (!confirm(`Resend ticket email to ${tx.email}?`)) return;
    setResending(tx.id);
    try {
      const res = await fetch('/api/send-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_API_SECRET ?? '',
        },
        body: JSON.stringify({ email: tx.email, name: tx.buyerName, ticketCode: tx.id, tierName: tx.tier, capacity: tx.totalCapacity }),
      });
      alert(res.ok ? 'Email resent!' : 'Failed to resend. Check Resend config.');
    } catch { alert('Network error.'); }
    finally { setResending(null); }
  };

  const handleManualMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    try {
      const code = generateTicketCode();
      const cfg  = TIER_CONFIG[manualData.tier as keyof typeof TIER_CONFIG];
      await setDoc(doc(db, 'tickets', code), {
        buyerName:      manualData.name,
        email:          manualData.email || 'admin-generated@nacos.com',
        phone:          manualData.phone || 'N/A',
        tier:           manualData.tier,
        price:          manualData.type === 'comp' ? 0 : cfg.price,
        totalPaid:      manualData.type === 'comp' ? 0 : cfg.price,
        fee:            0,
        totalCapacity:  cfg.capacity,
        admissionsUsed: 0,
        status:         manualData.type === 'comp' ? 'COMP' : 'PAID (CASH)',
        squadRef:       `MANUAL_${manualData.type.toUpperCase()}_${Date.now()}`,
        createdAt:      new Date().toISOString(),
      });
      alert(`Ticket created!\nCode: ${code}\nShare this with the guest.`);
      setShowManualModal(false);
      setManualData({ name: '', email: '', phone: '', tier: 'regular', type: 'comp' });
    } catch { alert('Failed to generate ticket.'); }
    finally { setIsMinting(false); }
  };

  const handleExportCSV = () => {
    if (!transactions.length) return alert('No transactions to export.');
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Guest Name', 'Email', 'Phone', 'Ticket Code', 'Tier', 'Capacity', 'Amount (NGN)', 'Status', 'Date'];
    const rows = transactions.map((tx) => [
      esc(tx.buyerName), esc(tx.email), esc(tx.phone), esc(tx.id),
      esc(tx.tier), esc(tx.totalCapacity ?? 1), tx.totalPaid ?? tx.price ?? 0,
      esc(tx.status), esc(new Date(tx.createdAt).toLocaleString()),
    ]);
    const csv  = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'nacos-dinner-tickets.csv';
    link.click();
  };

  const filtered = transactions.filter((tx) =>
    (tx.buyerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (tx.id || '').includes(searchTerm) ||
    (tx.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const statusStyle = (status: string) =>
    status?.includes('COMP')
      ? 'bg-blue-900/20 text-blue-400 border-blue-900/30'
      : status === 'paid'
      ? 'bg-green-900/20 text-green-400 border-green-900/30'
      : 'bg-amber-900/20 text-amber-400 border-amber-900/30';

  if (isAuthLoading || !isAuthorized) return <div className="min-h-screen bg-[#0a0514]" />;

  return (
    <div className="min-h-screen bg-[#0a0514] p-6 md:p-12 text-white font-sans selection:bg-purple-500">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-purple-900/40 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Gala Command Center
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Live Event Telemetry & Operations</p>
          </div>
          <nav className="flex items-center space-x-3 text-sm font-medium">
            <span className="text-white bg-purple-600/20 border border-purple-500/30 px-4 py-2 rounded-lg">Dashboard</span>
            <Link href="/admin/scanner" className="text-purple-400 hover:text-white px-4 py-2 transition-colors">Scanner</Link>
            <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 font-bold border border-red-900/50 bg-red-900/20 px-4 py-2 rounded-lg transition-colors">
              Logout
            </button>
          </nav>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Tickets Sold',    value: stats.totalSold,  suffix: 'tickets', color: 'purple' },
            { label: 'Guests Admitted',        value: stats.admitted,   suffix: `/ ${stats.totalSold} total`, color: 'blue' },
            { label: 'Gross Revenue',          value: `₦${stats.revenue.toLocaleString()}`, suffix: '', color: 'green' },
          ].map((k) => (
            <div key={k.label} className={`bg-[#150a26] p-6 rounded-2xl border border-${k.color}-900/50 shadow-2xl`}>
              <p className={`text-${k.color}-400/70 text-xs font-bold tracking-widest uppercase mb-2`}>{k.label}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-5xl font-bold text-${k.color}-400`}>{k.value}</p>
                {k.suffix && <span className="text-zinc-500 text-sm">{k.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Capacity ── */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e]">
            <h2 className="text-xl font-serif">Capacity & Inventory</h2>
            {!isEditingCaps
              ? <button onClick={() => setIsEditingCaps(true)} className="text-xs font-bold bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-800 px-4 py-2 rounded-lg transition-colors">EDIT LIMITS</button>
              : <button onClick={handleSaveCaps} disabled={isSaving} className="text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg disabled:opacity-50">{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</button>
            }
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {([
              { id: 'regular', name: 'Regular Pass', sold: tierStats.regular, cap: caps.regular, color: 'bg-purple-500' },
              { id: 'couples', name: 'Couples Pass', sold: tierStats.couples, cap: caps.couples, color: 'bg-pink-500'   },
              { id: 'table',   name: 'Table of 5',   sold: tierStats.table,   cap: caps.table,   color: 'bg-amber-500'  },
            ] as const).map((tier) => {
              const pct = tier.cap > 0 ? Math.min(100, Math.round((tier.sold / tier.cap) * 100)) : 0;
              return (
                <div key={tier.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold">{tier.name}</p>
                    {isEditingCaps
                      ? <input type="number" value={caps[tier.id as keyof typeof caps]} onChange={(e) => setCaps({ ...caps, [tier.id]: Number(e.target.value) })} className="w-20 bg-[#0a0514] border border-purple-600 rounded px-2 py-1 text-white text-sm text-right focus:outline-none" />
                      : <p className="text-sm font-bold text-white">{tier.sold} <span className="text-zinc-600">/ {tier.cap}</span></p>
                    }
                  </div>
                  <div className="w-full bg-[#0a0514] rounded-full h-2.5 border border-purple-900/30 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${tier.color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-right text-[10px] text-zinc-500 font-mono">{pct}% sold</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Transaction Ledger ── */}
        <div className="bg-[#150a26] rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-6 border-b border-purple-900/30 bg-[#1a0c2e] gap-4">
            <h2 className="text-xl font-serif">Guest Ledger</h2>
            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
              <div className="relative w-full sm:w-auto">
                <input
                  type="text" placeholder="Search name, email or code…" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 bg-[#0a0514] border border-purple-800/50 text-sm text-white rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-zinc-500 hover:text-white">✕</button>}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setShowManualModal(true)} className="flex-1 sm:flex-none text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Mint Ticket
                </button>
                <button onClick={handleExportCSV} disabled={!transactions.length} className="flex-1 sm:flex-none text-sm font-bold bg-green-600/20 border border-green-600/50 hover:bg-green-600 text-green-400 hover:text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50">
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
                  <th className="px-6 py-4 font-bold">Guest</th>
                  <th className="px-6 py-4 font-bold">Code</th>
                  <th className="px-6 py-4 font-bold">Tier</th>
                  <th className="px-6 py-4 font-bold">Paid</th>
                  <th className="px-6 py-4 font-bold">Admissions</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/20">
                {filtered.map((tx) => {
                  const isExpanded = expandedId === tx.id;
                  const admitted   = tx.admissionsUsed ?? 0;
                  const capacity   = tx.totalCapacity ?? 1;
                  const full       = admitted >= capacity;

                  return (
                    <React.Fragment key={tx.id}>
                      {/* ── Main row ── */}
                      <tr
                        className="hover:bg-purple-900/10 transition-colors cursor-pointer group"
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-white group-hover:text-purple-300 transition-colors">{tx.buyerName}</p>
                          <p className="text-xs text-zinc-500">{tx.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-purple-400 text-xs">{tx.id}</td>
                        <td className="px-6 py-4 capitalize font-medium">{tx.tier}</td>
                        <td className="px-6 py-4 font-medium">₦{(tx.totalPaid ?? tx.price ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${full ? 'text-red-400' : 'text-green-400'}`}>
                            {admitted}/{capacity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold border tracking-wider ${statusStyle(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-zinc-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </td>
                      </tr>

                      {/* ── Expanded panel ── */}
                      {isExpanded && (
                        <tr className="bg-[#0f071c]">
                          <td colSpan={7} className="px-6 pb-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                              {/* Guest info */}
                              <div className="bg-[#150a26] rounded-xl p-4 border border-purple-900/30 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Guest Details</p>
                                <p className="text-xs text-zinc-400">📧 {tx.email}</p>
                                <p className="text-xs text-zinc-400">📱 {tx.phone || 'N/A'}</p>
                                <p className="text-xs text-zinc-400">🕐 {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</p>
                                {tx.squadRef && <p className="text-xs text-zinc-600 font-mono break-all">Ref: {tx.squadRef}</p>}
                                {tx.upgradedFrom && (
                                  <p className="text-xs text-amber-400">⬆ Upgraded from {tx.upgradedFrom}</p>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleResendEmail(tx); }}
                                  disabled={resending === tx.id}
                                  className="mt-2 w-full py-2 text-xs font-bold bg-purple-900/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {resending === tx.id ? 'Sending…' : '✉ Resend Email'}
                                </button>
                              </div>

                              {/* Check-in */}
                              <div className="bg-[#150a26] rounded-xl p-4 border border-purple-900/30">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Check-In</p>
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="flex-1 bg-[#0a0514] rounded-lg p-3 text-center">
                                    <p className="text-3xl font-bold text-white">{admitted}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase mt-1">Admitted</p>
                                  </div>
                                  <span className="text-zinc-600 text-lg">/</span>
                                  <div className="flex-1 bg-[#0a0514] rounded-lg p-3 text-center">
                                    <p className="text-3xl font-bold text-purple-400">{capacity}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase mt-1">Total</p>
                                  </div>
                                </div>
                                {full ? (
                                  <div className="w-full py-3 text-center text-xs font-bold bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg">
                                    ALL GUESTS ADMITTED
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCheckIn(tx); }}
                                    disabled={checkingIn === tx.id}
                                    className="w-full py-3 text-sm font-bold bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {checkingIn === tx.id ? 'Processing…' : `✓ Admit 1 Guest (${capacity - admitted} left)`}
                                  </button>
                                )}
                              </div>

                              {/* Upgrade */}
                              <div className="bg-[#150a26] rounded-xl p-4 border border-purple-900/30">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Upgrade Ticket</p>
                                <p className="text-xs text-zinc-500 mb-3">Current tier: <span className="text-white capitalize font-bold">{tx.tier}</span></p>
                                <select
                                  value={upgradeTier[tx.id] ?? tx.tier}
                                  onChange={(e) => { e.stopPropagation(); setUpgradeTier((prev) => ({ ...prev, [tx.id]: e.target.value })); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 mb-3 appearance-none"
                                >
                                  <option value="regular">Regular — ₦5,000</option>
                                  <option value="couples">Couples — ₦15,000</option>
                                  <option value="table">Table of 5 — ₦50,000</option>
                                </select>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpgrade(tx); }}
                                  disabled={upgrading === tx.id || (upgradeTier[tx.id] ?? tx.tier) === tx.tier}
                                  className="w-full py-2.5 text-xs font-bold bg-amber-600/20 border border-amber-600/50 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg transition-colors disabled:opacity-30"
                                >
                                  {upgrading === tx.id ? 'Upgrading…' : 'Apply Upgrade'}
                                </button>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      {searchTerm ? 'No guests match your search.' : 'No transactions yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Mint Modal ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#150a26] border border-purple-900/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-serif text-white mb-1">Mint Manual Ticket</h2>
            <p className="text-zinc-400 text-sm mb-6">Generate a code without a payment gateway.</p>
            <form onSubmit={handleManualMint} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Guest Name *</label>
                <input required type="text" value={manualData.name} onChange={(e) => setManualData({ ...manualData, name: e.target.value })} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" placeholder="e.g. Dr. Jane Smith" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Email</label>
                <input type="email" value={manualData.email} onChange={(e) => setManualData({ ...manualData, email: e.target.value })} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" placeholder="guest@email.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Phone</label>
                <input type="tel" value={manualData.phone} onChange={(e) => setManualData({ ...manualData, phone: e.target.value })} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" placeholder="08012345678" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Tier</label>
                  <select value={manualData.tier} onChange={(e) => setManualData({ ...manualData, tier: e.target.value })} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none">
                    <option value="regular">Regular</option>
                    <option value="couples">Couples</option>
                    <option value="table">Table of 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Type</label>
                  <select value={manualData.type} onChange={(e) => setManualData({ ...manualData, type: e.target.value })} className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none">
                    <option value="comp">VIP / Comp</option>
                    <option value="cash">Cash at Door</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-2 border-t border-purple-900/30">
                <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 py-3 border border-purple-900 hover:bg-purple-900/30 text-white font-bold rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isMinting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                  {isMinting ? 'Minting…' : 'Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}