'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from '@/services/auth';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  // Read redirect param once (client-side only)
  const redirectTo =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect') || '/home'
      : '/home';

  // Redirect already-authenticated users away from the auth page
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace(redirectTo);
    });
  }, [router, redirectTo]);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    // Show error if redirected back from a failed OAuth attempt
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('error') === 'oauth_failed' ? 'Google sign-in failed. Please try again.' : '';
    }
    return '';
  });

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // Supabase redirects to /auth/callback — no setUser needed here
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user =
        mode === 'login'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, name);
      setUser(user);
      router.replace(redirectTo);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message.replace('AuthApiError: ', '')
          : 'Authentication failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => router.back()} className="text-gray-500 mb-6">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 minerva-gradient rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-[#1D1D1D]">
            trip<span className="text-[#607BFF]">up</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-[#1D1D1D]">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-gray-500 mt-1">
          {mode === 'login' ? 'Sign in to continue planning' : 'Start your travel journey'}
        </p>
      </div>

      <div className="flex-1 px-5 pb-10">
        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-4 font-medium text-[#1D1D1D] shadow-soft hover:shadow-card transition-shadow mb-6 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.2-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.3-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3L6 33.2C9.4 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.5-4.7 5.9l6.3 5.1C41.2 35.2 44 30 44 24c0-1.3-.2-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#607BFF] transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-white rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#607BFF] transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-white rounded-xl px-4 py-3 text-sm outline-none border border-gray-200 focus:border-[#607BFF] transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-[#607BFF] font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
