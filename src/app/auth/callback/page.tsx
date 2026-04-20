'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('OAuth callback error:', error.message);
        router.replace('/auth?error=oauth_failed');
      } else {
        router.replace(redirectTo);
      }
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
