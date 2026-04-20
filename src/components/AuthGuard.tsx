'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { supabaseUserToAppUser } from '@/services/auth';
import { Sparkles } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
        setChecking(false);
      } else {
        setUser(null);
        router.replace('/auth');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
        setChecking(false);
      } else {
        setUser(null);
        router.replace('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setUser]);

  if (checking) {
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
