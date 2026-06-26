"use client";

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      // 1. Log the user in via Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email) {
        // 2. Look up the user's email in the new Firestore 'users' collection
        const userRef = doc(db, 'users', user.email.toLowerCase());
        const userSnap = await getDoc(userRef);

        // 3. Check their role
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          // They are an Admin!
          sessionStorage.setItem('nacos_role', 'admin');
          router.push('/admin/dashboard');
        } else {
          // They are not in the database, or they are an usher
          sessionStorage.setItem('nacos_role', 'usher');
          router.push('/admin/scanner');
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0514] flex items-center justify-center p-4">
      <div className="bg-[#150a26] border border-purple-900/50 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
        <h1 className="text-3xl font-serif text-white mb-2">Staff Portal</h1>
        <p className="text-zinc-400 text-sm mb-8">Authenticate to access the command center.</p>
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full bg-white text-black font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In with Google'}
        </button>
      </div>
    </div>
  );
}