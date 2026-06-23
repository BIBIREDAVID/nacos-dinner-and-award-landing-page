import React from 'react';
import Image from 'next/image';

export default function NacosGalaLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1b0a33] to-[#0f041a] text-zinc-50 font-sans selection:bg-purple-500 selection:text-white overflow-hidden relative">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          {/* NACOS Logo */}
          <div className="relative w-10 h-10 flex-shrink-0">
             <img 
              src="/nacos-logo.png" 
              alt="NACOS Logo" 
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
            />
          </div>
          <span className="font-semibold tracking-wide text-lg text-white/90">NACOS-LASU Awards</span>
        </div>
        <div className="hidden md:block text-sm font-medium text-purple-200/60 tracking-widest uppercase">
          30 Jun 2026 · Lagos
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-28 flex flex-col lg:flex-row items-center justify-between gap-16">
        
        {/* Left Column: Copy & CTAs */}
        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#2a134d]/50 border border-purple-800/50 text-xs font-mono text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              <span className="uppercase tracking-wider">Masked Edition</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white">
              The Science of <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
                Excellence.
              </span>
            </h1>
            
            <p className="text-lg text-purple-100/70 max-w-xl leading-relaxed">
              Step into the mystery and prestige of the Masked Edition. Hosted by the Office of the Social Director (Big Bolaji), join us for an exclusive evening celebrating the brightest minds in our computing community.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-[#1b0a33] font-semibold rounded-lg hover:bg-purple-50 transition-colors duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Get Tickets
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-[#230e46] border border-purple-800/50 text-white font-medium rounded-lg hover:bg-[#2d1557] transition-colors duration-200">
              Nominate / Vote
            </button>
          </div>
        </div>

        {/* Right Column: Floating Spec Card */}
        <div className="w-full lg:w-[400px]">
          <div className="p-8 rounded-2xl bg-[#1e0a3c]/80 backdrop-blur-xl border border-purple-800/40 shadow-2xl space-y-6">
            <div className="border-b border-purple-800/40 pb-4">
              <p className="text-xs font-mono text-purple-300/60 mb-1">EVENT</p>
              <p className="font-medium text-lg text-purple-50">Science of Excellence</p>
            </div>
            <div className="border-b border-purple-800/40 pb-4">
              <p className="text-xs font-mono text-purple-300/60 mb-1">DATE & TIME</p>
              <p className="font-medium text-lg text-purple-50">Tue, 30 June 2026</p>
              <p className="text-sm text-purple-200/80 mt-1">Red Carpet: 8:00 PM | Main Event: 9:00 PM</p>
            </div>
            <div className="border-b border-purple-800/40 pb-4">
              <p className="text-xs font-mono text-purple-300/60 mb-1">VENUE</p>
              <p className="font-medium text-lg text-purple-50">TBA (To Be Announced)</p>
            </div>
            <div className="pb-2">
              <p className="text-xs font-mono text-purple-300/60 mb-1">TICKETS</p>
              <div className="flex flex-col space-y-1 mt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/80">Regular</span>
                  <span className="font-medium text-purple-50">₦5,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/80">Couples</span>
                  <span className="font-medium text-purple-50">₦15,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/80">Table of 5</span>
                  <span className="font-medium text-purple-50">₦50,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Info Bar (Quick Stats) */}
      <div className="relative z-10 border-t border-purple-900/50 bg-[#140626]/80 backdrop-blur-md w-full">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-purple-900/50">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <span className="text-3xl font-light text-white mb-1">30</span>
              <span className="text-xs font-semibold text-purple-300/60 uppercase tracking-wider">June 2026</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4 border-l border-purple-900/50">
              <span className="text-3xl font-light text-white mb-1">8 <span className="text-lg">PM</span></span>
              <span className="text-xs font-semibold text-purple-300/60 uppercase tracking-wider">Red Carpet</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4 border-l border-purple-900/50">
              <span className="text-3xl font-light text-white mb-1">TBA</span>
              <span className="text-xs font-semibold text-purple-300/60 uppercase tracking-wider">Secret Venue</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-4 border-l border-purple-900/50">
              <span className="text-3xl font-light text-white mb-1">03</span>
              <span className="text-xs font-semibold text-purple-300/60 uppercase tracking-wider">Ticket Tiers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto relative z-10 w-full border-t border-purple-900/50 py-6 bg-[#0f041a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-purple-300/60">
          <div className="text-center md:text-left">
            © 2026 NACOS-LASU · The Visionary Led Administration
          </div>
          <div className="text-center">
            Enquiries: <span className="text-purple-300">09027719794 (Big Bolaji)</span>
          </div>
          <div className="text-center md:text-right">
            Built by <span className="text-purple-300">BIBIRESANMI DAVID (BIBIREDAVID)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}