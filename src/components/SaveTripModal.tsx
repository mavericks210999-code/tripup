'use client';

import { useState } from 'react';
import { X, Mail, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { signInWithGoogle, sendMagicLink } from '@/services/auth';

interface SaveTripModalProps {
  open: boolean;
  onClose: () => void;
  /** What triggered the modal — drives copy */
  context?: 'share' | 'save' | 'create';
  /** URL to return to after OAuth redirect */
  returnUrl?: string;
  /** Called when user explicitly skips — lets the underlying action proceed */
  onSkip?: () => void;
}

export default function SaveTripModal({
  open,
  onClose,
  context = 'save',
  returnUrl,
  onSkip,
}: SaveTripModalProps) {
  const [view, setView] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle(returnUrl);
      // Redirect happens automatically
    } catch {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const redirect = returnUrl
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${window.location.origin}/auth/callback`;
      await sendMagicLink(email.trim(), redirect);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const title =
    context === 'share' ? 'Share your trip' :
    context === 'create' ? 'Save your trip' :
    'Save your trip';
  const subtitle =
    context === 'share' ? 'Sign in to invite friends and share your itinerary' :
    context === 'create' ? 'Sign in so your trip is saved to your account and never lost' :
    'Sign in to access your trip from any device';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'backdropIn 0.2s ease-out' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl px-6 pt-4 pb-10 animate-sheet-up">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-11 h-11 minerva-gradient rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        {/* ─── Success state ──────────────────────────────────────────── */}
        {sent ? (
          <div className="py-4">
            <h2 className="text-xl font-bold text-[#1D1D1D] mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              We sent a magic link to{' '}
              <span className="font-semibold text-[#1D1D1D]">{email}</span>.
              Click it to sign in — your trip will be right here waiting.
            </p>
          </div>
        ) : view === 'main' ? (
          /* ─── Main view ─────────────────────────────────────────────── */
          <>
            <h2 className="text-2xl font-bold text-[#1D1D1D] mb-1">{title}</h2>
            <p className="text-gray-500 text-sm mb-6">{subtitle}</p>

            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-2xl py-4 font-semibold text-[#1D1D1D] hover:bg-gray-50 active:bg-gray-100 transition-colors mb-3 disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Email */}
            <button
              onClick={() => setView('email')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#1D1D1D] text-white rounded-2xl py-4 font-semibold hover:bg-gray-800 active:bg-gray-900 transition-colors mb-4 disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              Continue with Email
            </button>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {onSkip && (
              <button
                onClick={() => { onClose(); onSkip(); }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1 mt-1"
              >
                Skip for now
              </button>
            )}

            <p className="text-center text-xs text-gray-400 mt-2">
              Your trip data is never lost — we just need an account to sync it.
            </p>
          </>
        ) : (
          /* ─── Email view ─────────────────────────────────────────────── */
          <>
            <button
              onClick={() => { setView('main'); setError(''); }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold text-[#1D1D1D] mb-1">Your email</h2>
            <p className="text-gray-500 text-sm mb-5">We'll send a magic link — no password needed</p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
              placeholder="you@example.com"
              autoFocus
              className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-[#1D1D1D] outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors mb-3"
            />

            <button
              onClick={handleMagicLink}
              disabled={loading || !email.trim()}
              className="w-full bg-[#607BFF] text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#4d6aff] active:bg-[#3d5aef] transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Magic Link
            </button>

            {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
