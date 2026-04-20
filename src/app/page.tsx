'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

/**
 * Root route — redirects to /home immediately.
 * AuthGuard on /home handles the anonymous sign-in if needed.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3F2]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 minerva-gradient rounded-2xl flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-500 text-sm">Loading TripUp...</p>
      </div>
    </div>
  );
}
