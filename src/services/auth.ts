import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

// ─── Email / Password ─────────────────────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  const u = data.user!;
  return {
    uid: u.id,
    name: u.user_metadata?.full_name ?? name,
    email: u.email ?? '',
    photoURL: u.user_metadata?.avatar_url ?? undefined,
  };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const u = data.user;
  return {
    uid: u.id,
    name: u.user_metadata?.full_name ?? u.email ?? 'Traveler',
    email: u.email ?? '',
    photoURL: u.user_metadata?.avatar_url ?? undefined,
  };
}

// ─── OAuth (Google) ───────────────────────────────────────────────────────────

export async function signInWithGoogle(returnTo?: string): Promise<void> {
  const base = `${window.location.origin}/auth/callback`;
  const redirectTo = returnTo ? `${base}?next=${encodeURIComponent(returnTo)}` : base;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  // Redirect happens automatically — no return value needed
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function supabaseUserToAppUser(supabaseUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>): User {
  return {
    uid: supabaseUser.id,
    name:
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      supabaseUser.email ??
      'Traveler',
    email: supabaseUser.email ?? '',
    photoURL:
      supabaseUser.user_metadata?.avatar_url ??
      supabaseUser.user_metadata?.picture ??
      undefined,
    isAnonymous: supabaseUser.is_anonymous ?? false,
  };
}

export async function sendMagicLink(email: string, redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  });
  if (error) throw error;
}
