'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { supabaseUserToAppUser } from '@/services/auth';
import { Sparkles } from 'lucide-react';

/**
 * AuthGuard — auto-signs users in anonymously if they have no session.
 * No login page, no redirect. Users just land and start using the app.
 *
 * Anonymous sessions are real Supabase sessions with a valid JWT and uid,
 * so Supabase RLS, API auth, and rate limiting all work transparently.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { setUser } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
        setReady(true);
        return;
      }

      // No session — sign in anonymously (no email/password required)
      const { data, error } = await supabase.auth.signInAnonymously();
      if (data.user && !error) {
        setUser(supabaseUserToAppUser(data.user));
      }
      setReady(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (!ready) {
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

  return <>{children}</>;
}
