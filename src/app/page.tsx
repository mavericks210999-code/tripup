'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/home');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F5F3F2] flex flex-col animate-fade-in-up">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative">
        <div className="absolute top-20 right-0 w-64 h-64 bg-[#607BFF]/10 rounded-full blur-3xl -mr-32 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 minerva-gradient rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#1D1D1D]">
              trip<span className="text-[#607BFF]">up</span>
            </span>
          </div>

          <h1 className="text-5xl font-bold text-[#1D1D1D] leading-tight mb-6">
            Plan trips with <span className="text-[#607BFF]">AI</span>
          </h1>
          <p className="text-lg text-gray-600 mb-12 leading-relaxed">
            Group travel planning made simple. AI-generated itineraries, expense splitting, and real-time collaboration.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-12">
            {[
              { emoji: '🗺️', text: 'AI Itineraries' },
              { emoji: '💸', text: 'Split Expenses' },
              { emoji: '👥', text: 'Group Planning' },
              { emoji: '📍', text: 'Explore Places' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-2">
                <span className="text-xl">{f.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/auth')}
            className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-colors"
          >
            Start Planning
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Free to use · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
