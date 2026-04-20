import type { User } from '@/types';

const KEY = 'tripup_guest_user';

export function getOrCreateGuestUser(): User {
  if (typeof window === 'undefined') {
    return { uid: 'server-guest', name: 'Traveler', email: '' };
  }
  const stored = localStorage.getItem(KEY);
  if (stored) {
    try { return JSON.parse(stored) as User; } catch { /* fall through */ }
  }
  const id = crypto.randomUUID();
  const guest: User = { uid: id, name: 'Traveler', email: '' };
  localStorage.setItem(KEY, JSON.stringify(guest));
  return guest;
}
