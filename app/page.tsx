import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function NacosGalaLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1b0a33] to-[#0f041a] text-zinc-50 font-sans selection:bg-purple-500 selection:text-white overflow-hidden relative">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 flex-shrink-0">
             <Image 
              src="/nacos-logo.png" 
              alt="NACOS Logo"
              width={40}
              height={40} 
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
            <a href="#tickets" className="w-full sm:w-auto px-8 py-4 bg-white text-[#1b0a33] font-semibold rounded-lg hover:bg-purple-50 transition-colors duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-center">
              Get Tickets
            </a>
            <a href="https://wa.me/2349027719794?text=Hello,%20I%20am%20contacting%20you%20from%20the%20NACOS%20LASU%20Dinner%20and%20Awards%20Night%20and%20I%20would%20like%20to%20make%20a%20reservation" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-[#230e46] border border-purple-800/50 text-white font-medium rounded-lg hover:bg-[#2d1557] transition-colors duration-200 text-center">
              Reserve a Table
            </a>
          </div>
        </div>

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

      {/* Info Bar */}
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

      {/* About Section */}
      <section className="relative z-10 w-full bg-[#0a0514] pt-24 pb-12 border-t border-purple-900/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1">
            <p className="text-[#d46b53] text-xs font-bold tracking-widest uppercase mb-4">About The Gala</p>
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight leading-tight mb-6">
              One night of mystery, elegance, and pure computing excellence.
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-lg">
              The Science of Excellence (Masked Edition) is the premier social event for the NACOS-LASU community. Hosted by the Visionary Led Administration, this dinner and award night brings together students, tech innovators, and faculty to celebrate outstanding achievements in an atmosphere of prestige and high fashion.
            </p>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-[#150a26] p-10 md:p-12 rounded-lg shadow-xl border border-purple-900/30 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl"></div>
              <p className="relative z-10 text-xl md:text-2xl font-serif text-white italic leading-relaxed mb-8">
                "Excellence is not just what we code, it is how we celebrate the minds behind the machines."
              </p>
              <p className="relative z-10 text-[#d46b53] text-xs font-mono tracking-wider uppercase">
                — Office of the Social Director (Big Bolaji)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tickets Section (Dark Theme Applied) */}
      <section id="tickets" className="relative z-10 w-full bg-[#0a0514] pt-12 pb-24 border-t border-purple-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-[#d46b53] text-xs font-bold tracking-widest uppercase mb-4">Choose Your Tier</p>
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight">Three ways to attend — pick what fits.</h2>
          </div>
          <div className="bg-[#150a26] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-purple-900/30">
            {/* Card 1 */}
            <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-dashed border-purple-900/50 flex flex-col">
              <div className="inline-block px-3 py-1 bg-purple-900/30 text-purple-300 text-[10px] font-bold uppercase tracking-widest rounded w-fit mb-6">Regular</div>
              <h3 className="text-xl font-medium text-white">Standard Pass</h3>
              <div className="mt-4 mb-2"><span className="text-4xl font-bold text-white">₦5,000</span></div>
              <p className="text-xs font-mono text-zinc-400 mb-8">Single entry ticket</p>
              <ul className="space-y-4 text-sm text-zinc-300 flex-1">
                <li className="flex items-start gap-3">✓ Standard Event Entry</li>
                <li className="flex items-start gap-3">✓ Red Carpet Access</li>
                <li className="flex items-start gap-3">✓ Standard Seating</li>
              </ul>
              <Link href="/checkout?tier=regular" className="mt-10 w-full py-3 bg-[#1e2926] text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-purple-900 transition-colors block text-center border border-purple-800">Select Ticket</Link>
            </div>
            {/* Card 2 */}
            <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-dashed border-purple-900/50 flex flex-col">
              <div className="inline-block px-3 py-1 bg-[#8c744d]/20 text-[#d4b483] text-[10px] font-bold uppercase tracking-widest rounded w-fit mb-6">Couples</div>
              <h3 className="text-xl font-medium text-white">Double Pass</h3>
              <div className="mt-4 mb-2"><span className="text-4xl font-bold text-white">₦15,000</span></div>
              <p className="text-xs font-mono text-zinc-400 mb-8">Valid for two (2) guests</p>
              <ul className="space-y-4 text-sm text-zinc-300 flex-1">
                <li className="flex items-start gap-3">✓ Entry for Two Guests</li>
                <li className="flex items-start gap-3">✓ Red Carpet & Paparazzi</li>
                <li className="flex items-start gap-3">✓ Premium Seating Zone</li>
              </ul>
              <Link href="/checkout?tier=couples" className="mt-10 w-full py-3 bg-[#1e2926] text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-purple-900 transition-colors block text-center border border-purple-800">Select Ticket</Link>
            </div>
            {/* Card 3 */}
            <div className="flex-1 p-8 md:p-10 flex flex-col bg-[#110521]">
              <div className="inline-block px-3 py-1 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest rounded w-fit mb-6">VIP</div>
              <h3 className="text-xl font-medium text-white">Table of 5</h3>
              <div className="mt-4 mb-2"><span className="text-4xl font-bold text-white">₦50,000</span></div>
              <p className="text-xs font-mono text-zinc-400 mb-8">Premium group experience</p>
              <ul className="space-y-4 text-sm text-zinc-300 flex-1">
                <li className="flex items-start gap-3">✓ VIP Table for 5 Guests</li>
                <li className="flex items-start gap-3">✓ Fast-Track Entry</li>
                <li className="flex items-start gap-3">✓ Premium Refreshments</li>
              </ul>
              <Link href="/checkout?tier=table" className="mt-10 w-full py-3 bg-[#d98f39] text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-[#c47e30] transition-colors text-center block border border-transparent">Reserve Table</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (Dark Theme Applied) */}
      <section className="relative z-10 w-full bg-[#0a0514] pb-24 pt-12 border-t border-purple-900/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-[#d46b53] text-xs font-bold tracking-widest uppercase mb-4">Good To Know</p>
            <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight">A few common questions</h2>
          </div>
          <div className="border-t border-purple-900/30">
            <details className="group border-b border-purple-900/30">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-white font-medium">
                Do I get a receipt if my ticket is reserved online?
                <span className="text-[#d46b53] font-bold text-lg">+</span>
              </summary>
              <div className="pb-6 text-sm text-zinc-400 leading-relaxed">Yes. Every successful reservation generates an emailed receipt and a unique 7-digit ticket code. This is your proof of payment and entry pass—keep it on your phone or print it for check-in.</div>
            </details>
            <details className="group border-b border-purple-900/30">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-white font-medium">
                What is the dress code for the "Masked Edition"?
                <span className="text-[#d46b53] font-bold text-lg">+</span>
              </summary>
              <div className="pb-6 text-sm text-zinc-400 leading-relaxed">The dress code is Black Tie / Tech Elegant, accompanied by a masquerade mask. This is the night to swap your hoodies for suits, tuxedos, and elegant gowns.</div>
            </details>
            <details className="group border-b border-purple-900/30">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-white font-medium">
                How does check-in work on the day?
                <span className="text-[#d46b53] font-bold text-lg">+</span>
              </summary>
              <div className="pb-6 text-sm text-zinc-400 leading-relaxed">Upon arrival, present your 7-digit code to our ushers. We track admissions dynamically, so guests on a Couples or Table ticket can arrive and check in at different times.</div>
            </details>
            <details className="group border-b border-purple-900/30">
              <summary className="flex cursor-pointer items-center justify-between py-6 text-white font-medium">
                What's the refund policy on paid tickets?
                <span className="text-[#d46b53] font-bold text-lg">+</span>
              </summary>
              <div className="pb-6 text-sm text-zinc-400 leading-relaxed">Tickets are non-refundable. However, if you are unable to attend, you may transfer your ticket to another student by contacting the organizing committee at least 48 hours prior to the event.</div>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto relative z-10 w-full py-8 bg-[#05020a] border-t border-purple-900/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-purple-300/60">
          <div className="flex items-center space-x-3 text-center md:text-left">
            <span className="text-[#d46b53] font-bold text-xl"></span>
            <span>© 2026 NACOS-LASU · The Visionary Led Administration</span>
          </div>
          <div className="text-center">Enquiries: <a href="https://wa.me/2349027719794" className="text-purple-300 hover:text-white transition-colors">09027719794(Big Bolaji)</a></div>
          <div className="text-center md:text-right">Built by <span className="text-purple-300">BIBIRESANMI DAVID</span></div>
        </div>
      </footer>
    </div>
  );
}