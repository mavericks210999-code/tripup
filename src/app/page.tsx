'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuroraOrb } from '@/components/AuroraOrb';

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
        <div className="w-12 h-12 rounded-2xl overflow-hidden">
          <AuroraOrb />
        </div>
        <p className="text-gray-500 text-sm">Loading TripUp...</p>
      </div>
    </div>
  );
}
