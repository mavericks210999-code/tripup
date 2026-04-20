import { ItineraryDay } from '@/types';
import { supabase } from '@/lib/supabase';

export interface MinervaResponse {
  days: ItineraryDay[];
  message?: string;
}

/** Returns Authorization header with the current Supabase session token. */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function generateItinerary(
  prompt: string,
  context?: { destination?: string; days?: number; style?: string }
): Promise<MinervaResponse> {
  const response = await fetch('/api/minerva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ prompt, type: 'generate', context }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate itinerary');
  }

  return response.json();
}

export async function modifyItinerary(
  prompt: string,
  currentItinerary: ItineraryDay[]
): Promise<MinervaResponse> {
  const response = await fetch('/api/minerva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ prompt, type: 'modify', currentItinerary }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to modify itinerary');
  }

  return response.json();
}

export async function askMinerva(
  prompt: string,
  context?: { destination?: string; currentItinerary?: ItineraryDay[] }
): Promise<string> {
  const response = await fetch('/api/minerva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ prompt, type: 'chat', context }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get response');
  }

  const data = await response.json();
  return data.message || '';
}
