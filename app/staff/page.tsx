"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN;
    const usherPin = process.env.NEXT_PUBLIC_USHER_PIN;

    if (pin === adminPin) {
      // Grant Master Access
      sessionStorage.setItem('nacos_role', 'admin');
      router.push('/admin/dashboard');
    } else if (pin === usherPin) {
      // Grant Scanner-Only Access
      sessionStorage.setItem('nacos_role', 'usher');
      router.push('/admin/scanner');
    } else {
      setError('Invalid Access PIN');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0514] flex items-center justify-center p-4 selection:bg-purple-500">
      <div className="bg-[#150a26] border border-purple-900/50 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-white mb-2">Staff Portal</h1>
          <p className="text-purple-400/60 text-sm">Enter your designated access PIN</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-[#0a0514] border border-purple-800/50 rounded-lg px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="••••"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}