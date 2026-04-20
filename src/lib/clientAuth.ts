'use client';

import { supabase } from '@/lib/supabase';

/**
 * Returns Authorization header for authenticated API calls.
 * Call this in client components before fetching /api/* routes.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
