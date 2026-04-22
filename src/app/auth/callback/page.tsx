'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { joinTripByCode } from '@/services/trips';
import { supabaseUserToAppUser } from '@/services/auth';
import { Sparkles } from 'lucide-react';

/**
 * Handles Supabase OAuth redirect (client-side).
 * Supabase sends ?code=... after Google sign-in.
 * We exchange it for a session in the browser so it lands in localStorage.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
      router.replace('/auth?error=oauth_failed');
      return;
    }

    const redirectTo = new URLSearchParams(window.location.search).get('next') || '/home';
    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      if (error) {
        console.error('OAuth callback error:', error.message);
        router.replace('/auth?error=oauth_failed');
        return;
      }
      // Handle pending trip join from invite link
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode && data.session?.user) {
        localStorage.removeItem('pendingInviteCode');
        const appUser = supabaseUserToAppUser(data.session.user);
        try {
          const tripId = await joinTripByCode(pendingCode, {
            id: appUser.uid,
            name: appUser.name || 'Traveler',
            email: appUser.email || '',
            initial: (appUser.name || 'T')[0].toUpperCase(),
            photoURL: appUser.photoURL,
          });
          if (tripId) { router.replace(`/trip/${tripId}`); return; }
        } catch { /* fall through to normal redirect */ }
      }
      router.replace(redirectTo);
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3F2]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 minerva-gradient rounded-2xl flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
